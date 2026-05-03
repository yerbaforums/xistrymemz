'use client'

import styles from './ComingSoonModal.module.css'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export function ComingSoonModal({ isOpen, onClose, feature = 'This feature' }: ComingSoonModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.icon}>🚧</div>
        <h3>Coming Soon</h3>
        <p>{feature} is still under development.</p>
        <p className={styles.subtext}>We are working hard to bring you the best experience. Stay tuned!</p>
        <button className={styles.closeBtn} onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}
