'use client'

import { useState } from 'react'
import QuickPinModal from '@/components/QuickPinModal'
import styles from './PinToBoardButton.module.css'

interface PinToBoardButtonProps {
  entityType: string
  entityId: string
  entityTitle: string
  entityImage?: string
  entityLatitude?: number
  entityLongitude?: number
  variant?: 'primary' | 'secondary' | 'ghost'
  label?: string
}

export default function PinToBoardButton({ entityType, entityId, entityTitle, entityImage, entityLatitude, entityLongitude, variant = 'secondary', label }: PinToBoardButtonProps) {
  const [showQuickPin, setShowQuickPin] = useState(false)

  return (
    <>
      <button
        className={`${styles.btn} ${styles[variant]}`}
        onClick={() => setShowQuickPin(true)}
        title="Pin to community bulletin board"
      >
        📌 {label || 'Pin to Board'}
      </button>
      {showQuickPin && (
        <QuickPinModal
          entityType={entityType}
          entityId={entityId}
          entityTitle={entityTitle}
          entityImage={entityImage}
          entityLatitude={entityLatitude}
          entityLongitude={entityLongitude}
          onClose={() => setShowQuickPin(false)}
          onPinned={() => setShowQuickPin(false)}
        />
      )}
    </>
  )
}
