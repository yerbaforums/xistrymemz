'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { useToast } from '@/context/ToastContext'
import AddToCalendar from '@/components/AddToCalendar'
import styles from './TicketQRModal.module.css'

interface TicketData {
  ticketCode: string
  quantity: number
  paymentStatus: string
  purchasedAt?: string
  paidAt?: string
  scannedAt?: string | null
  usedAt?: string | null
  txHash?: string | null
  selectedCurrency?: string | null
  user: { id?: string; name: string | null }
  event: {
    title: string
    eventDate: string | null
    isVirtual?: boolean
    meetingLink?: string | null
    organizer?: { name: string | null }
  }
}

interface TicketQRModalProps {
  ticketCode: string
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  PAID: '#22c55e',
  APPROVED: '#ef4444',
  CANCELLED: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Payment Pending',
  PAID: 'Confirmed',
  APPROVED: 'Used',
  CANCELLED: 'Cancelled',
}

export default function TicketQRModal({ ticketCode, onClose }: TicketQRModalProps) {
  const { error: toastError } = useToast()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    fetch(`/api/tickets/${ticketCode}`)
      .then(r => {
        if (!r.ok) { toastError('Failed to load ticket'); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        const t = data?.data?.ticket || data?.ticket
        if (!t) { toastError('Ticket not found'); setLoading(false); return }
        setTicket(t)
        const ticketUrl = `${window.location.origin}/tickets/${ticketCode}`
        QRCode.toDataURL(ticketUrl, {
          width: 240,
          margin: 2,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        }).then(setQrDataUrl).catch(() => {})
        setLoading(false)
      })
      .catch(() => { toastError('Failed to load ticket'); setLoading(false) })
  }, [ticketCode])

  const handlePrint = () => {
    if (ticket) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>${ticket.event.title} - Ticket</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 20px; color: #111; }
            .ticket { max-width: 400px; margin: 0 auto; border: 3px dashed #333; border-radius: 12px; padding: 24px; text-align: center; }
            .event-title { font-size: 1.3rem; font-weight: 700; }
            .meta { color: #666; font-size: 0.85rem; margin: 4px 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 0.8rem; margin: 8px 0; }
            .qr { margin: 16px 0; }
            .code { font-size: 0.75rem; color: #888; font-family: monospace; }
          </style></head><body>
          <div class="ticket">
            <div class="event-title">${ticket.event.title}</div>
            ${ticket.event.eventDate ? `<div class="meta">${new Date(ticket.event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>` : ''}
            <div class="meta">Attendee: ${ticket.user.name || 'Guest'} · ${ticket.quantity}x</div>
            <div class="status" style="background:${STATUS_COLORS[ticket.paymentStatus]}22;color:${STATUS_COLORS[ticket.paymentStatus]}">${STATUS_LABELS[ticket.paymentStatus]}</div>
            <div class="qr"><img src="${qrDataUrl}" width="200" height="200" /></div>
            <div class="code">Ticket: ${ticketCode.slice(0, 8)}...${ticketCode.slice(-4)}</div>
          </div></body></html>`)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
  }

  if (loading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.loading}>Loading ticket...</div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <p>Ticket not found.</p>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[ticket.paymentStatus] || '#666'
  const isPaid = ticket.paymentStatus === 'PAID' || ticket.paymentStatus === 'APPROVED'
  const isVirtual = ticket.event.isVirtual
  const meetingLink = ticket.event.meetingLink

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>🎫 Your Ticket</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.ticketCard}>
            <div className={styles.eventInfo}>
              <h4 className={styles.eventTitle}>{ticket.event.title}</h4>
              {ticket.event.eventDate && (
                <div className={styles.eventDate}>
                  {new Date(ticket.event.eventDate).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </div>
              )}
              <div className={styles.attendee}>
                {ticket.user.name || 'Guest'} &middot; {ticket.quantity}x
              </div>
            </div>

            <div
              className={styles.statusBadge}
              style={{ background: `${statusColor}20`, color: statusColor, borderColor: `${statusColor}40` }}
            >
              {STATUS_LABELS[ticket.paymentStatus]}
            </div>

            {isPaid && isVirtual && meetingLink && (
              <div className={styles.meetingSection}>
                <div className={styles.meetingLabel}>Meeting Link</div>
                <div className={styles.meetingLinkRow}>
                  <code className={styles.meetingLink}>{meetingLink}</code>
                  <button className={styles.copyLinkBtn} onClick={() => { navigator.clipboard.writeText(meetingLink) }}>Copy</button>
                </div>
                {ticket.event.eventDate && (
                  <div style={{ marginTop: 8 }}>
                    <AddToCalendar params={{
                      title: ticket.event.title,
                      location: undefined,
                      meetingLink: meetingLink || undefined,
                      startTime: ticket.event.eventDate!,
                      endTime: ticket.event.eventDate!,
                    }} variant="link" />
                  </div>
                )}
              </div>
            )}

            {!isPaid && isVirtual && (
              <div className={styles.pendingNote}>
                Meeting link will be available once your payment is confirmed.
              </div>
            )}

            <div className={styles.qrSection}>
              {qrDataUrl && (
                <Image
                  src={qrDataUrl}
                  alt="Ticket QR Code"
                  width={220}
                  height={220}
                  className={styles.qrImage}
                />
              )}
            </div>

            <div className={styles.ticketCodeRow}>
              <span className={styles.ticketCodeLabel}>Ticket Code</span>
              <code className={styles.ticketCode}>{ticket.ticketCode.slice(0, 8)}</code>
            </div>

            {ticket.txHash && (
              <div className={styles.paymentInfo}>
                <span>TX: {ticket.txHash.slice(0, 10)}...{ticket.txHash.slice(-6)}</span>
                {ticket.selectedCurrency && <span> · {ticket.selectedCurrency}</span>}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button onClick={handlePrint} className={styles.printBtn}>🖨️ Print / Download</button>
            <button onClick={onClose} className={styles.doneBtn}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
