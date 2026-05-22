'use client'

import Link from 'next/link'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './PassportSection.module.css'

export default function PassportSection() {
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <div className={styles.icon}>🌍</div>
        <h2 className={styles.title}>Earth Passport</h2>
        <p className={styles.subtitle}>
          A universal reference to search, connect, and share your whereabouts across the network
        </p>
        <div className={styles.cards}>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🪪</span>
            <h4>Universal Reference</h4>
            <p>Your Earth Passport is your universal reference on the network. Search within, notify others of your whereabouts, and stay connected wherever you are.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>⭐</span>
            <h4>Reputation & Badges</h4>
            <p>Earn trust badges through successful transactions, contributions, and community engagement.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>📍</span>
            <h4>Location Features</h4>
            <p>Show your home or traveling status, set search radius, and discover people and listings near you.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🎭</span>
            <h4>User Classes</h4>
            <p>Express your role with 14 identity classes — Healer, Builder, Explorer, Sage, and more.</p>
          </div>
        </div>
        <Link href="/profile/edit" className={styles.cta}>
          Set Up Your Passport →
        </Link>
      </div>
    </section>
  )
}
