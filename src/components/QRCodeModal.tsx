'use client'

import { useState } from 'react'
import styles from './QRCodeModal.module.css'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  currency: string
  address: string
}

export function QRCodeModal({ isOpen, onClose, currency, address }: QRCodeModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{currency} QR Code</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.qrContainer}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&bgcolor=0d0d0d&color=ffffff`}
            alt={`${currency} QR code`}
            width={200}
            height={200}
          />
        </div>
        <code className={styles.address}>{address}</code>
        <button
          className={styles.copyBtn}
          onClick={() => navigator.clipboard.writeText(address)}
        >
          Copy Address
        </button>
      </div>
    </div>
  )
}
