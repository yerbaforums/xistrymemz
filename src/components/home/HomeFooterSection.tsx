'use client'

import Link from 'next/link'
import styles from './HomeFooterSection.module.css'

export default function HomeFooterSection() {
  return (
    <section className={styles.section}>
      <div className={styles.links}>
        <Link href="/about">About</Link>
        <Link href="/help">Help</Link>
        <Link href="/community">Community</Link>
        <Link href="/community/forum">Forum</Link>
        <Link href="/requests">Requests</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <p className={styles.copyright}>&copy; {new Date().getFullYear()} XistrYmemZ — Cosmic Whitepages Cooperative</p>
    </section>
  )
}
