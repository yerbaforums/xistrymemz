'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useToast } from '@/context/ToastContext'
import { CRYPTO_ICONS } from '@/lib/crypto-icons'
import styles from './TicketPaymentModal.module.css'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
  sortOrder: number
}

interface TicketPaymentModalProps {
  eventId: string
  eventTitle: string
  organizerId: string
  ticketPrice: number
  currency: string
  quantity: number
  onClose: () => void
  onPurchased: () => void
}

export default function TicketPaymentModal({
  eventId,
  eventTitle,
  organizerId,
  ticketPrice,
  currency,
  quantity,
  onClose,
  onPurchased,
}: TicketPaymentModalProps) {
  const { success, error } = useToast()
  const [step, setStep] = useState<'select' | 'confirm' | 'done'>('select')
  const [addresses, setAddresses] = useState<DonationAddr[]>([])
  const [loadingAddrs, setLoadingAddrs] = useState(true)
  const [selectedAddr, setSelectedAddr] = useState<DonationAddr | null>(null)
  const [txHash, setTxHash] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState('')

  useEffect(() => {
    fetch(`/api/users/donations?userId=${organizerId}`)
      .then(r => r.json())
      .then(data => {
        const addrs = data?.data?.addresses || data?.addresses || []
        setAddresses(addrs)
        if (addrs.length === 1) setSelectedAddr(addrs[0])
      })
      .catch(() => error('Failed to load payment addresses'))
      .finally(() => setLoadingAddrs(false))
  }, [organizerId])

  const total = ticketPrice * quantity

  const handleConfirm = async () => {
    if (!selectedAddr) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/events/${eventId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          txHash: txHash.trim() || null,
          paymentNote: paymentNote.trim() || null,
          selectedCurrency: selectedAddr.currency,
          selectedAddress: selectedAddr.address,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTicketCode(data?.ticket?.ticketCode || data?.data?.ticketCode || data?.ticketCode || '')
        setStep('done')
        success('Ticket request submitted!')
        onPurchased()
      } else {
        error(data.error || 'Failed to submit ticket request')
      }
    } catch {
      error('Failed to submit ticket request')
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => success('Address copied!'))
  }

  const cryptoInfo = selectedAddr ? CRYPTO_ICONS[selectedAddr.currency] : null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>🎫 Request Tickets</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        {step === 'select' && (
          <div className={styles.body}>
            <div className={styles.summary}>
              <span className={styles.eventName}>{eventTitle}</span>
              <span className={styles.orderInfo}>
                {quantity} × ${ticketPrice.toFixed(2)} = <strong>${total.toFixed(2)}</strong>
              </span>
            </div>

            <div className={styles.section}>
              <h4>Choose a payment address</h4>
              <p className={styles.hint}>
                Send your payment to one of the organizer&apos;s addresses below.
              </p>
            </div>

            {loadingAddrs && (
              <div className={styles.loading}>Loading payment addresses...</div>
            )}

            {!loadingAddrs && addresses.length === 0 && (
              <div className={styles.noAddresses}>
                <p>The organizer hasn&apos;t set up any payment addresses yet.</p>
                <p className={styles.hint}>
                  You can still submit a ticket request without selecting an address.
                </p>
              </div>
            )}

            {!loadingAddrs && addresses.length > 0 && (
              <div className={styles.addressList}>
                {addresses.map(addr => {
                  const info = CRYPTO_ICONS[addr.currency]
                  const isSelected = selectedAddr?.id === addr.id
                  return (
                    <button
                      key={addr.id}
                      className={`${styles.addressCard} ${isSelected ? styles.addressCardSelected : ''}`}
                      onClick={() => setSelectedAddr(addr)}
                    >
                      <div className={styles.addressLeft}>
                        {info && (
                          <Image
                            src={info.icon}
                            alt={info.name}
                            width={24}
                            height={24}
                            className={styles.cryptoIcon}
                          />
                        )}
                        <div>
                          <span className={styles.addressLabel}>
                            {addr.label || info?.name || addr.currency}
                          </span>
                          <code className={styles.addressText}>
                            {addr.address.slice(0, 12)}...{addr.address.slice(-6)}
                          </code>
                        </div>
                      </div>
                      <button
                        className={styles.copyBtn}
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(addr.address) }}
                        title="Copy address"
                      >
                        📋
                      </button>
                    </button>
                  )
                })}
              </div>
            )}

            <div className={styles.section}>
              <h4>Payment details</h4>
              <label className={styles.fieldLabel}>
                Transaction Hash (optional)
              </label>
              <input
                type="text"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                placeholder="0x..."
                className={styles.input}
              />
              <label className={styles.fieldLabel}>
                Note (optional)
              </label>
              <textarea
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="Add a note for the organizer..."
                rows={2}
                className={styles.textarea}
              />
            </div>

            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={submitting || (addresses.length > 0 && !selectedAddr)}
            >
              {submitting ? 'Submitting...' : `Confirm Ticket Request — $${total.toFixed(2)}`}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className={styles.body}>
            <div className={styles.successIcon}>✅</div>
            <h4 className={styles.successTitle}>Ticket Request Submitted!</h4>
            {ticketCode && (
              <div className={styles.ticketCodeBox}>
                <span className={styles.ticketCodeLabel}>Ticket Code</span>
                <code className={styles.ticketCodeValue}>{ticketCode.slice(0, 8)}...</code>
              </div>
            )}
            <p className={styles.successText}>
              Your payment is <strong>pending verification</strong>. The organizer will mark your ticket
              as paid once they confirm your transaction.
            </p>
            {selectedAddr && cryptoInfo && (
              <div className={styles.paymentReminder}>
                <span className={styles.reminderLabel}>Send to:</span>
                <div className={styles.reminderAddr}>
                  <Image src={cryptoInfo.icon} alt={cryptoInfo.name} width={20} height={20} />
                  <code>{selectedAddr.address.slice(0, 12)}...{selectedAddr.address.slice(-6)}</code>
                </div>
              </div>
            )}
            {!txHash && (
              <p className={styles.hint}>
                Don&apos;t forget to send your payment to complete the order.
              </p>
            )}
            <button className={styles.confirmBtn} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
