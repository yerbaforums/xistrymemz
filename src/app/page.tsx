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
          <h3>Community Connections</h3>
          <p>Connect with others, coordinate efforts, and build your network</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>📋</span>
          <h3>Cohesive Planning</h3>
          <p>Powerful organizational tools for teams and individuals</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>💼</span>
          <h3>Business Opportunities</h3>
          <p>Build clientele, showcase skills, and grow your business</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🏪</span>
          <h3>Shop &amp; School</h3>
          <p>Sell products, teach courses, and share your expertise</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>💰</span>
          <h3>Crypto Payments</h3>
          <p>Accept donations, payments, and escrow via crypto</p>
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
