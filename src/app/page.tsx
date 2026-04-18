'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  const [email, setEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [subscribeMessage, setSubscribeMessage] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubscribeStatus('loading')
    setSubscribeMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing_page' })
      })
      const data = await res.json()

      if (res.ok) {
        setSubscribeStatus('success')
        setSubscribeMessage(data.message)
        setEmail('')
      } else {
        setSubscribeStatus('error')
        setSubscribeMessage(data.error || 'Something went wrong')
      }
    } catch {
      setSubscribeStatus('error')
      setSubscribeMessage('Failed to subscribe. Please try again.')
    }
  }

  return (
    <div className={styles.landing}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="XistrYmemZ" />
            XistrYmemZ
          </div>
          
          <h1 className={styles.title}>
            Plan. Request. <span className={styles.accent}>Complete.</span>
          </h1>
          
          <p className={styles.subtitle}>
            Create detailed plans, submit requests to complete them, 
            and track your progress with powerful collaboration features.
          </p>
          
          <div className={styles.actions}>
            <Link href="/auth/register" className={styles.btnPrimary}>
              Get Started
            </Link>
            <Link href="/auth/login" className={styles.btnSecondary}>
              Sign In
            </Link>
          </div>

          <div className={styles.emailSignup}>
            <h3>Stay Updated</h3>
            <p>Get notified about new features and community updates</p>
            <form onSubmit={handleSubscribe} className={styles.subscribeForm}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.subscribeInput}
              />
              <button 
                type="submit" 
                className={styles.subscribeBtn}
                disabled={subscribeStatus === 'loading'}
              >
                {subscribeStatus === 'loading' ? '...' : 'Join'}
              </button>
            </form>
            {subscribeMessage && (
              <p className={subscribeStatus === 'success' ? styles.successMsg : styles.errorMsg}>
                {subscribeMessage}
              </p>
            )}
          </div>
        </div>

          <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3>Launch Projects</h3>
            <p>Create ambitious projects with goals, milestones, and track progress</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤝</div>
            <h3>Collaborate</h3>
            <p>Get help from the community, accept requests, and complete together</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💰</div>
            <h3>Fund & Earn</h3>
            <p>Accept donations and memberships via crypto or fiat payments</p>
          </div>
        </div>

        <div className={styles.projectsCta}>
          <h2>Explore Projects</h2>
          <p>Discover amazing projects from our community or start your own</p>
          <div className={styles.ctaButtons}>
            <Link href="/plans/public" className={styles.btnPrimary}>
              Browse Projects
            </Link>
            <Link href="/auth/register" className={styles.btnSecondary}>
              Start a Project
            </Link>
          </div>
        </div>

        <div className={styles.donateSection}>
          <h2>Support XistrYmemZ</h2>
          <p>Help us keep the platform free and independent</p>
          <div className={styles.paymentOptions}>
            <div className={styles.paymentCard}>
              <h3>Crypto Donations</h3>
              <p>Send ETH or USDT to support our mission</p>
              <div className={styles.cryptoAddresses}>
                <div className={styles.cryptoItem}>
                  <span className={styles.cryptoLabel}>ETH:</span>
                  <code>0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab12</code>
                </div>
                <div className={styles.cryptoItem}>
                  <span className={styles.cryptoLabel}>USDT:</span>
                  <code>0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab12</code>
                </div>
              </div>
            </div>
            <div className={styles.paymentCard}>
              <h3>Fiat Support</h3>
              <p>One-time or recurring payments via card</p>
              <Link href="#" className={styles.donateBtn}>
                Donate with Card
              </Link>
            </div>
            <div className={styles.paymentCard}>
              <h3>Membership</h3>
              <p>Get premium features and support us monthly</p>
              <Link href="/plans" className={styles.membershipBtn}>
                Become a Member
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Open source • Built with Next.js</p>
        <div className={styles.donations}>
          <p>
            Donate Tari/XTM: <code className={styles.address}>128Fop9866GtF5WD5cE1FgmMuwRmiddj2ZRaNewMWh4WQPuVuTUz15DwA2AmFzTgAN2nRig4EXZY6QtgMZjZdLxWoqE</code>
          </p>
          <p>
            Donate Monero/XMR: <code className={styles.address}>83bjLcDbqc3Srwuo6uraFCG1tQ98BZCDLAodCrnZFhCyFtcEx6awuF63GhHocw9SK1gDujttS5KoCEH2G94iDexQHHa6PXs</code>
          </p>
        </div>
      </footer>
    </div>
  )
}
