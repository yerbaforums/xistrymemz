'use client'

import { useState, useEffect } from 'react'
import styles from './Loading.module.css'

const MESSAGES = [
  'Summoning the dragon...',
  'Breathing fire...',
  'Charting the stars...',
  'Forging connections...',
  'Unlocking portals...',
  'Gathering energies...',
  'Awakening ancient powers...',
  'Weaving the web...',
]

export default function Loading({ message, size = 'medium' }: { message?: string | null; size?: 'small' | 'medium' | 'large' }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    if (message !== null && message !== undefined) return
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [message])

  const displayMessage = message !== null && message !== undefined ? message : MESSAGES[msgIndex]

  return (
    <div className={`${styles.container} ${styles[size]}`} role="status" aria-label="Loading">
      <div className={styles.dragonWrapper}>
        <div className={styles.glowRing} />
        <div className={styles.particles}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={styles.particle} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
        <div className={styles.flames}>
          <span className={styles.flame}>🔥</span>
          <span className={styles.flame}>🔥</span>
          <span className={styles.flame}>🔥</span>
        </div>
        <span className={styles.dragon}>🐉</span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} />
      </div>
      <div className={`${styles.logo} ${styles.logoGlow}`}>
        XistrYmemZ
      </div>
      <p className={styles.message}>{displayMessage}</p>
    </div>
  )
}
