'use client'

import { useState } from 'react'
import styles from './QRCodeModal.module.css'
import { getCryptoIcon, getCryptoName, getCryptoColor } from '@/lib/crypto-icons'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  currency: string
  address: string
}

export function QRCodeModal({ isOpen, onClose, currency, address }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const iconUrl = getCryptoIcon(currency)
  const fullName = getCryptoName(currency)
  const color = getCryptoColor(currency)
  const initials = currency.substring(0, 2).toUpperCase()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{fullName} QR Code</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.cryptoBadge}>
          {iconUrl ? (
            <img src={iconUrl} alt={fullName} className={styles.cryptoIconImg} />
          ) : (
            <span className={styles.cryptoIconFallback} style={{ background: color }}>
              {initials}
            </span>
          )}
          <span className={styles.cryptoTicker}>({currency.toUpperCase()})</span>
        </div>
        <div className={styles.qrContainer}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&bgcolor=0d0d0d&color=ffffff`}
            alt={`${fullName} QR code`}
            width={200}
            height={200}
          />
        </div>
        <code className={styles.address}>{address}</code>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? 'Copied!' : 'Copy Address'}
        </button>
      </div>
    </div>
  )
}
