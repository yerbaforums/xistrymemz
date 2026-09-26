'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CRYPTO_LOGOS } from '@/lib/constants'
import { QRCodeModal } from '@/components/QRCodeModal'
import { useToast } from '@/context/ToastContext'
import styles from './TipAuthorButton.module.css'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label?: string | null
}

// Prominent tip affordance for detail pages: shows the author's public
// donation addresses (copy + QR) in one tap. Manual-crypto norm applies —
// readers send off-platform and self-report; nothing auto-charges.
export default function TipAuthorButton({ authorId }: { authorId: string }) {
  const [open, setOpen] = useState(false)
  const [addresses, setAddresses] = useState<DonationAddr[]>([])
  const [loading, setLoading] = useState(false)
  const [qrAddr, setQrAddr] = useState<DonationAddr | null>(null)
  const { success } = useToast()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/users/donations?userId=${authorId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => setAddresses(data?.data?.addresses || data?.addresses || []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false))
  }, [open, authorId])

  function copy(addr: string) {
    navigator.clipboard.writeText(addr)
    success('Address copied!')
  }

  return (
    <>
      <button type="button" className={styles.tipBtn} onClick={() => setOpen(true)} aria-label="Tip the author">
        💎 Tip
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Tip the author">
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>💎 Tip the author</h3>
            <p className={styles.modalDesc}>Send a tip directly to one of the author&apos;s addresses below.</p>
            {loading ? (
              <p className={styles.modalDesc}>Loading donation addresses…</p>
            ) : addresses.length > 0 ? (
              <div className={styles.addrList}>
                {addresses.map(da => (
                  <div key={da.id} className={styles.addrRow}>
                    {CRYPTO_LOGOS[da.currency] ? (
                      <Image src={`/crypto-logos/${CRYPTO_LOGOS[da.currency]}`} alt="" width={20} height={20} style={{ borderRadius: '50%' }} />
                    ) : (
                      <span aria-hidden="true" className={styles.genericBadge}>💎</span>
                    )}
                    <span className={styles.currency}>{da.label || da.currency}</span>
                    <code className={styles.code} title={da.address}>
                      {da.address.length > 20 ? `${da.address.slice(0, 10)}…${da.address.slice(-6)}` : da.address}
                    </code>
                    <button type="button" className={styles.copyBtn} onClick={() => copy(da.address)}>Copy</button>
                    <button type="button" className={styles.qrBtn} onClick={() => setQrAddr(da)} title="Show QR">📱</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.modalDesc}>This author hasn&apos;t set up any donation addresses yet.</p>
            )}
            <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
      {qrAddr && (
        <QRCodeModal isOpen={true} onClose={() => setQrAddr(null)} currency={qrAddr.label || qrAddr.currency} address={qrAddr.address} />
      )}
    </>
  )
}
