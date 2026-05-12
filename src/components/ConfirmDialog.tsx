'use client'

import { useRef } from 'react'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          {variant === 'danger' && <span className={styles.dangerIcon} aria-hidden="true">&#33;</span>}
          {variant === 'warning' && <span className={styles.warningIcon} aria-hidden="true">&#9888;</span>}
          {variant === 'default' && <span className={styles.defaultIcon} aria-hidden="true">&#63;</span>}
        </div>
        <h3 id="confirm-title" className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`${styles.confirmBtn} ${variant === 'danger' ? styles.confirmDanger : ''} ${variant === 'warning' ? styles.confirmWarning : ''}`}
            onClick={() => {
              onConfirm()
              onClose()
            }}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
