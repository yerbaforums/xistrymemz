'use client'

import styles from './Loading.module.css'

interface LoadingProps {
  message?: string | null
  size?: 'small' | 'medium' | 'large'
}

export default function Loading({ message, size = 'medium' }: LoadingProps) {
  return (
    <div className={`${styles.container} ${styles[size]}`} role="status" aria-label="Loading">
      <div className={styles.dragonWrapper}>
        <div className={styles.glowRing} />
        <span className={styles.dragon}>🐉</span>
      </div>
      <div className={`${styles.logo} ${styles.logoGlow}`}>
        XistrYmemZ
      </div>
      {message !== null && message !== undefined && (
        <p className={styles.message}>{message}</p>
      )}
    </div>
  )
}
