'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS } from '@/lib/constants'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  showQR: boolean
}

export default function About() {
  const [donations, setDonations] = useState<DonationAddr[]>([])
  const [qrOpen, setQrOpen] = useState<DonationAddr | null>(null)

  useEffect(() => {
    fetch('/api/site/donations')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.addresses) setDonations(data.addresses) })
      .catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img src="/logo.png" alt="XistrYmemZ" className={styles.logo} />
        <h1>XistrYmemZ</h1>
        <p>The cooperative platform for building, sharing, and growing together.</p>
      </section>

      <section className={styles.content}>
        <div className={styles.block}>
          <h2>What is XistrYmemZ?</h2>
          <p>
            XistrYmemZ is an open-source community platform where creators, developers, tradespeople, 
            and neighbors collaborate on projects, offer services, buy and sell, teach skills, and 
            organize events — all in one place.
          </p>
        </div>

        <div className={styles.block}>
          <h2>Core Features</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <h3>🚀 Projects & Plans</h3>
              <p>Create detailed project plans with goals, milestones, and resources. Invite collaborators and track progress together.</p>
            </div>
            <div className={styles.feature}>
              <h3>🛒 Marketplace</h3>
              <p>Buy and sell products, list items for rent, and accept offers. Set up your own shop with custom branding.</p>
            </div>
            <div className={styles.feature}>
              <h3>🔧 Services</h3>
              <p>Offer your skills — from guitar lessons to web design. Accept appointments with built-in scheduling, set your hours, and manage bookings.</p>
            </div>
            <div className={styles.feature}>
              <h3>📹 Video Chat</h3>
              <p>Start or join video rooms for face-to-face collaboration, remote lessons, consultations, or just hanging out.</p>
            </div>
            <div className={styles.feature}>
              <h3>📝 Requests & Barter</h3>
              <p>Post what you need and accept offers from the community. Trade services, barter, and coordinate through the offer system.</p>
            </div>
            <div className={styles.feature}>
              <h3>📅 Events & Planner</h3>
              <p>Host community events, manage your appointment calendar, and keep track of upcoming commitments.</p>
            </div>
            <div className={styles.feature}>
              <h3>🏫 Schools & Teaching</h3>
              <p>Create educational content — articles, tutorials, courses, and video lessons. Build your school and grow a following.</p>
            </div>
            <div className={styles.feature}>
              <h3># Hashtags</h3>
              <p>Follow hashtags to discover new content across projects, services, events, and posts. Trending tags highlight what the community is talking about.</p>
            </div>
            <div className={styles.feature}>
              <h3>👥 Community</h3>
              <p>Join groups, connect with other members, participate in forums, and build your network — all within the platform.</p>
            </div>
            <div className={styles.feature}>
              <h3>🔄 Share & Repost</h3>
              <p>Share any project, service, event, or product to your feed. Repost content you find interesting to spread the word.</p>
            </div>
          </div>
        </div>

        <div className={styles.block}>
          <h2>Getting Started</h2>
          <p>New here? Here&apos;s how to get going:</p>
          <div className={styles.links}>
            <Link href="/auth/register">1. Create your account</Link>
            <Link href="/onboarding">2. Complete your profile</Link>
            <Link href="/plans/public">3. Browse projects</Link>
            <Link href="/services">4. Explore services</Link>
            <Link href="/community">5. Join the community</Link>
          </div>
        </div>

        {donations.length > 0 && (
          <div className={styles.block}>
            <h2>Support XistrYmemZ</h2>
            <p>Help us keep the platform free and independent. Donations are optional and go directly toward hosting, development, and community programs.</p>
            <div className={styles.donationList}>
              {donations.map(da => (
                <div key={da.id} className={styles.donationItem}>
                  <img
                    src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`}
                    alt={da.currency}
                    width={24}
                    height={24}
                  />
                  <span className={styles.donationLabel}>{da.label || da.currency}</span>
                  <code className={styles.donationAddr} title={da.address}>{da.address}</code>
                  <DonationActions address={da.address} onQrClick={() => setQrOpen(da)} size="md" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.block}>
          <h2>Links</h2>
          <div className={styles.links}>
            <Link href="/help">Help center</Link>
            <Link href="/contact">Contact us</Link>
            <Link href="/terms">Terms of service</Link>
            <Link href="/privacy">Privacy policy</Link>
          </div>
        </div>
      </section>

      {qrOpen && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrOpen(null)}
          currency={qrOpen.label || qrOpen.currency}
          address={qrOpen.address}
        />
      )}
    </div>
  )
}