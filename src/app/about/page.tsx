'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS } from '@/lib/constants'
import Breadcrumbs from '@/components/Breadcrumbs'

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
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'About' },
      ]} />
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
          <p>
            No ads. No data selling. No AI scraping your content. No algorithms deciding what you see. No shadowbanning. No censorship.
            Your data, your community, your terms.
          </p>
        </div>

        <div className={styles.block}>
          <h2>Our Promise</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <h3>🚫 Ad-Free</h3>
              <p>No banners, no pop-ups, no sponsored posts. Your experience is never interrupted by advertising. We fund the platform through optional donations, not by selling your attention.</p>
            </div>
            <div className={styles.feature}>
              <h3>🔒 Your Data, Not for Sale</h3>
              <p>We never sell, share, or trade your personal data to third parties. Your profile, content, messages, and activity stay yours. Period. No exceptions, no loopholes.</p>
            </div>
            <div className={styles.feature}>
              <h3>🤖 AI-Free Zone</h3>
              <p>No AI scraping, no AI-generated content fed into your feed, no AI trained on your data. Everything on XistrYmemZ is created by real people for real people.</p>
            </div>
            <div className={styles.feature}>
              <h3>📊 No Algorithmic Tampering</h3>
              <p>No algorithm decides what you see. Content appears chronologically and by your own choices — follow who you want, join what you want, see what you follow. No hidden ranking, no favor manipulation.</p>
            </div>
            <div className={styles.feature}>
              <h3>👁️ No Shadowbanning</h3>
              <p>We don't secretly suppress your reach. If there's an issue with your content, you'll know. No invisible penalties, no reduced visibility without explanation. Full transparency.</p>
            </div>
            <div className={styles.feature}>
              <h3>✊ No Censorship</h3>
              <p>Your voice matters. We don't censor legal content or suppress viewpoints. The community sets its own norms through groups and forums. Content is only removed for illegal material or clear violations of our terms.</p>
            </div>
          </div>
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