'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  showQR: boolean
}

export default function Home() {
  const [donations, setDonations] = useState<DonationAddr[]>([])

  useEffect(() => {
    fetch('/api/site/donations')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.addresses) setDonations(data.addresses) })
      .catch(() => {})
  }, [])

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr)
  }

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
          <p>Connect with others, coordinate efforts, and build your network globally</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>📋</span>
          <h3>Cohesive Planning</h3>
          <p>Powerful organizational tools with milestones, progress tracking, and shared visibility</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>💼</span>
          <h3>Business Opportunities</h3>
          <p>Showcase skills, run shops and schools, accept payments, and build your clientele</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🏪</span>
          <h3>Shop &amp; School</h3>
          <p>Sell products, teach courses, manage escrow, and share your expertise</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>💰</span>
          <h3>Crypto Payments</h3>
          <p>Accept donations, payments, barter offers, and escrow via crypto wallets</p>
        </div>
        
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🌍</span>
          <h3>Building Clientele</h3>
          <p>Grow your audience through profiles, ratings, social links, and community engagement</p>
        </div>
      </section>

      {donations.length > 0 && (
        <section className={styles.donateSection}>
          <h2>Support XistrYmemZ</h2>
          <p>Help us keep the platform free and independent</p>
          <div className={styles.cryptoAddresses}>
            {donations.map(da => (
              <div key={da.id} className={styles.cryptoItem}>
                <div className={styles.cryptoItemHeader}>
                  <span className={styles.cryptoLabel}>{da.label || da.currency}</span>
                  <button onClick={() => copyAddress(da.address)} className={styles.copyBtn} title="Copy address">
                    Copy
                  </button>
                </div>
                <code className={styles.cryptoAddr}>{da.address}</code>
                {da.showQR && (
                  <div className={styles.qrCode}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(da.address)}&bgcolor=0d0d0d&color=ffffff`}
                      alt={`${da.currency} QR`}
                      width={120}
                      height={120}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
