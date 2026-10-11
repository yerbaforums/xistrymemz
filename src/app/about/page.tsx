'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS } from '@/lib/constants'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useTranslations } from 'next-intl'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  showQR: boolean
}

export default function About() {
  const t = useTranslations('about')
  const [donations, setDonations] = useState<DonationAddr[]>([])
  const [qrOpen, setQrOpen] = useState<DonationAddr | null>(null)

  useEffect(() => {
    fetch('/api/site/donations')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.data?.addresses || data?.addresses) setDonations(data?.data?.addresses || data?.addresses || []) })
      .catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: t('breadcrumb') },
      ]} />
      <section className={styles.hero}>
        <img src="/logo.png" alt="XistrYmemZ" className={styles.logo} />
        <h1>XistrYmemZ</h1>
        <p>{t('tagline')}</p>
      </section>

      <section className={styles.content}>
        <div className={styles.block}>
          <h2>{t('whatTitle')}</h2>
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
          <h2>{t('promiseTitle')}</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <h3>{t('promise1Title')}</h3>
              <p>No banners, no pop-ups, no sponsored posts. Your experience is never interrupted by advertising. We fund the platform through optional donations, not by selling your attention.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('promise2Title')}</h3>
              <p>We never sell, share, or trade your personal data to third parties. Your profile, content, messages, and activity stay yours. Period. No exceptions, no loopholes.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('promise3Title')}</h3>
              <p>No AI scraping, no AI-generated content fed into your feed, no AI trained on your data. Everything on XistrYmemZ is created by real people for real people.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('promise4Title')}</h3>
              <p>No algorithm decides what you see. Content appears chronologically and by your own choices — follow who you want, join what you want, see what you follow. No hidden ranking, no favor manipulation.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('promise5Title')}</h3>
              <p>We don&apos;t secretly suppress your reach. If there&apos;s an issue with your content, you&apos;ll know. No invisible penalties, no reduced visibility without explanation. Full transparency.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('promise6Title')}</h3>
              <p>Your voice matters. We don&apos;t censor legal content or suppress viewpoints. The community sets its own norms through groups and forums. Content is only removed for illegal material or clear violations of our terms.</p>
            </div>
          </div>
        </div>

        <div className={styles.block}>
          <h2>{t('featuresTitle')}</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <h3>{t('featProjects')}</h3>
              <p>Create detailed projects with goals, milestones, and resources. Invite collaborators and track progress together.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featMarketplace')}</h3>
              <p>Buy and sell products, list items for rent, and accept offers. Set up your own shop with custom branding.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featServices')}</h3>
              <p>Offer your skills — from guitar lessons to web design. Accept appointments with built-in scheduling, set your hours, and manage bookings.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featVideo')}</h3>
              <p>Start or join video rooms for face-to-face collaboration, remote lessons, consultations, or just hanging out.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featRequests')}</h3>
              <p>Post what you need and accept offers from the community. Trade services, barter, and coordinate through the offer system.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featEvents')}</h3>
              <p>Host community events, manage your appointment calendar, and keep track of upcoming commitments.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featSchools')}</h3>
              <p>Create educational content — articles, tutorials, courses, and video lessons. Build your school and grow a following.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featHashtags')}</h3>
              <p>Follow hashtags to discover new content across projects, services, events, and posts. Trending tags highlight what the community is talking about.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featCommunity')}</h3>
              <p>Join groups, connect with other members, participate in forums, and build your network — all within the platform.</p>
            </div>
            <div className={styles.feature}>
              <h3>{t('featShare')}</h3>
              <p>Share any project, service, event, or product to your feed. Repost content you find interesting to spread the word.</p>
            </div>
          </div>
        </div>

        <div className={styles.block}>
          <h2>{t('gettingTitle')}</h2>
          <p>{t('gettingSub')}</p>
          <div className={styles.links}>
            <Link href="/auth/register">{t('step1')}</Link>
            <Link href="/onboarding">{t('step2')}</Link>
            <Link href="/projects">{t('step3')}</Link>
            <Link href="/services">{t('step4')}</Link>
            <Link href="/community">{t('step5')}</Link>
          </div>
        </div>

        {donations.length > 0 && (
          <div className={styles.block}>
            <h2>{t('supportTitle')}</h2>
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
                  <code className={styles.donationAddr} title={da.address}>{da.address.length > 20 ? `${da.address.slice(0, 10)}…${da.address.slice(-6)}` : da.address}</code>
                  <DonationActions address={da.address} onQrClick={() => setQrOpen(da)} size="md" />
                </div>
              ))}
            </div>
            <p style={{ marginTop: 12 }}>
              <Link href="/donate">{t('supportCta')}</Link>
            </p>
          </div>
        )}

        <div className={styles.block}>
          <h2>{t('linksTitle')}</h2>
          <div className={styles.links}>
            <Link href="/help">{t('linkHelp')}</Link>
            <Link href="/contact">{t('linkContact')}</Link>
            <Link href="/terms">{t('linkTerms')}</Link>
            <Link href="/privacy">{t('linkPrivacy')}</Link>
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