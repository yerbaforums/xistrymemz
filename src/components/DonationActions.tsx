'use client'

import { useState } from 'react'
import styles from './DonationActions.module.css'

interface DonationActionsProps {
  address: string
  onQrClick: () => void
  size?: 'sm' | 'md'
}

export function DonationActions({ address, onQrClick, size = 'md' }: DonationActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const iconSize = size === 'sm' ? 14 : 16

  return (
    <div className={`${styles.actions} ${styles[size]}`}>
      <button onClick={onQrClick} className={styles.iconBtn} title="Show QR Code">
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="17" y="17" width="4" height="4" />
          <line x1="17" y1="14" x2="17" y2="15" />
          <line x1="14" y1="17" x2="15" y2="17" />
        </svg>
      </button>
      <button onClick={handleCopy} className={`${styles.iconBtn} ${copied ? styles.copied : ''}`} title="Copy address">
        {copied ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  )
}
