'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './FeedbackSection.module.css'

export default function FeedbackSection() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <section className={styles.section}>
      <div className={styles.badge}>v0.7.0 — Early Development</div>
      <h2 className={styles.title}>You Shape What&apos;s Next</h2>
      <p className={styles.subtitle}>
        XistrYmemZ is <strong>open source</strong> and <strong>community-driven</strong>.
        No ads, no data selling, no algorithms. Every feature exists because users asked for it.
      </p>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>💡</div>
          <h3>Have an Idea?</h3>
          <p>Feature requests and suggestions go straight into the development pipeline.</p>
          <Link href="/contact" className={styles.cardLink}>Request a Feature →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🐛</div>
          <h3>Found a Bug?</h3>
          <p>Report issues directly — every bug filed gets tracked and resolved.</p>
          <Link href="/contact" className={styles.cardLink}>Report a Bug →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🔧</div>
          <h3>Open Source</h3>
          <p>Contribute code, suggest improvements, or fork the project on GitHub.</p>
          <a href="https://github.com/yerbaforums/xistrymemz" target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
            View on GitHub →
          </a>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🌍</div>
          <h3>Our Vision</h3>
          <p>A cooperative platform where users own their data and shape the direction.</p>
          <Link href="/about" className={styles.cardLink}>Read Our Mission →</Link>
        </div>
      </div>
      <p className={styles.footer}>
        Your passport connects everything. Set your location and start building.{' '}
        {mounted && session?.user ? (
          <Link href="/dashboard/overview" className={styles.cta}>Go to Dashboard →</Link>
        ) : (
          <Link href="/auth/register" className={styles.cta}>Join us →</Link>
        )}
      </p>
    </section>
  )
}
