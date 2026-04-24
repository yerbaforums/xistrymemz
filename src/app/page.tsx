'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="XistrYmemZ" />
          <span>XistrYmemZ</span>
        </div>
        
        <h1 className={styles.title}>
          Plan. Request. <span className={styles.accent}>Complete.</span>
        </h1>
        
        <p className={styles.subtitle}>
          Collaborate on projects, get help from the community, and build something great together.
        </p>
        
        <div className={styles.actions}>
          <Link href="/auth/register" className={styles.btnPrimary}>
            Get Started
          </Link>
          <Link href="/plans/public" className={styles.btnSecondary}>
            Browse Projects
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🚀</span>
          <h3>Launch Projects</h3>
          <p>Create plans with goals, milestones, and track progress</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🤝</span>
          <h3>Collaborate</h3>
          <p>Get community help, accept requests, complete together</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>💰</span>
          <h3>Earn</h3>
          <p>Accept donations and payments via crypto or fiat</p>
        </div>
      </section>

      <section className={styles.cta}>
        <p>Open source. Built with Next.js.</p>
        <div className={styles.ctaLinks}>
          <Link href="/about">About</Link>
          <Link href="/help">Help</Link>
          <Link href="/community">Community</Link>
        </div>
      </section>
    </div>
  )
}
