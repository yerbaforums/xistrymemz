'use client'

import styles from './ComingSoonModal.module.css'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export function ComingSoonModal({ isOpen, onClose, feature = 'This feature' }: ComingSoonModalProps) {
  const modalRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} ref={modalRef}>
        <div className={styles.icon} aria-hidden="true">🚧</div>
        <h3>Coming Soon</h3>
        <p>{feature} is still under development.</p>
        <p className={styles.subtext}>We are working hard to bring you the best experience. Stay tuned!</p>
        <button className={styles.closeBtn} onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}
