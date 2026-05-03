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

const FEATURES = [
  { icon: '🌌', title: 'Cosmic Whitepages', desc: 'Your universal directory. One identity across the entire network — searchable, verifiable, yours.' },
  { icon: '🤝', title: 'Cooperative Network', desc: 'Built by the community, for the community. Every member contributes, every voice matters, every connection counts.' },
  { icon: '🚀', title: 'Launch Projects', desc: 'Create plans with goals, milestones, and track progress. Rally helpers and build something extraordinary together.' },
  { icon: '📋', title: 'Request & Fulfill', desc: 'Need help? Post a request. Have skills? Step up and fulfill. Simple coordination for complex collaboration.' },
  { icon: '🏪', title: 'Shop & School', desc: 'Sell products, teach courses, accept payments. Build your business and share your expertise with the world.' },
  { icon: '🌍', title: 'Earth Passport', desc: 'Verified identity, reputation scores, and trust badges. Your digital passport for the cooperative economy.' },
  { icon: '💰', title: 'Crypto Native', desc: 'Donations, barter offers, escrow, and direct payments. Privacy-respecting financial tools built in.' },
  { icon: '👥', title: 'Community Groups', desc: 'Find your people. Join groups, coordinate efforts, and build networks that span neighborhoods and continents.' },
  { icon: '🔗', title: 'Open & Connected', desc: 'Link your profiles, shops, and social presence. Everything interconnected, nothing siloed.' },
]

const STEPS = [
  { num: '01', title: 'Sign Up', desc: 'Create your account and claim your cosmic identity. No barriers, no gatekeeping.' },
  { num: '02', title: 'Build Your Profile', desc: 'Add your bio, links, shop, school. Make yourself findable in the whitepages.' },
  { num: '03', title: 'Connect & Create', desc: 'Join the network. Start projects, make requests, find collaborators.' },
  { num: '04', title: 'Grow Together', desc: 'Build reputation, earn trust, expand your reach. The coop grows with you.' },
]

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
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.stars} />
        <div className={styles.heroContent}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="XistrYmemZ" />
            <span>XistrYmemZ</span>
          </div>
          
          <h1 className={styles.title}>
            The <span className={styles.accent}>Cosmic Whitepages</span> Cooperative
          </h1>
          
          <p className={styles.subtitle}>
            Your universal identity, projects, and connections — all in one open network.
            Sign up and start building something extraordinary with the community.
          </p>
          
          <div className={styles.actions}>
            <Link href="/auth/register" className={styles.btnPrimary}>
              Join the Coop →
            </Link>
            <Link href="/about" className={styles.btnSecondary}>
              Learn More
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>Open</span>
              <span className={styles.statLabel}>Source</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Free</span>
              <span className={styles.statLabel}>Forever</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Coop</span>
              <span className={styles.statLabel}>Owned</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.stepsSection}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>Four steps to join the cooperative</p>
        <div className={styles.stepsGrid}>
          {STEPS.map(step => (
            <div key={step.num} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>What You Can Build</h2>
        <p className={styles.sectionSubtitle}>Everything you need to connect, create, and collaborate</p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={i} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Ready to Claim Your Place?</h2>
          <p>
            Join the cosmic whitepages cooperative. Create your profile, launch your first project,
            and start connecting with people who share your vision.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/auth/register" className={styles.btnPrimaryLarge}>
              Sign Up &amp; Start Building
            </Link>
            <Link href="/plans/public" className={styles.btnSecondaryLarge}>
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Donations */}
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

      {/* Footer Links */}
      <section className={styles.footerLinks}>
        <div className={styles.ctaLinks}>
          <Link href="/about">About</Link>
          <Link href="/help">Help</Link>
          <Link href="/community">Community</Link>
          <Link href="/requests">Requests</Link>
        </div>
        <p className={styles.copyright}>&copy; {new Date().getFullYear()} XistrYmemZ — Cosmic Whitepages Cooperative</p>
      </section>
    </div>
  )
}
