'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import styles from './Footer.module.css'
import { QRCodeModal } from './QRCodeModal'
import { CRYPTO_LOGOS } from '@/lib/constants'
import { fetchApi } from '@/lib/fetch-api'
import { getCryptoPrices } from '@/lib/prices'

const PACKAGE_VERSION = '0.8.0'
const GIT_HASH = process.env.NEXT_PUBLIC_GIT_HASH || 'dev'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'USDT' || currency === 'USDC') return `$${price.toFixed(2)}`
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (price >= 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(6)}`
}

export default function Footer() {
  const t = useTranslations('footer')
  const [donations, setDonations] = useState<DonationAddr[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [qrOpen, setQrOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchApi<{ addresses: DonationAddr[] }>('/api/site/donations')
      .then(({ addresses: addrs }) => setDonations(addrs || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (donations.length === 0) return
    getCryptoPrices().then(prices => {
      const mapped: Record<string, number> = {}
      for (const p of prices) mapped[p.symbol] = p.price
      setPrices(mapped)
    }).catch(() => {})
  }, [donations])

  const openQr = (da: DonationAddr) => setQrOpen(da.id)
  const closeQr = () => setQrOpen(null)
  const activeQr = donations.find(d => d.id === qrOpen)

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>XistrYmemZ</Link>
          <p>{t('brandTagline')}</p>
          <div className={styles.pillars}>
            <span className={styles.pillar}><span aria-hidden="true">🚫</span> Ad-Free</span>
            <span className={styles.pillar}><span aria-hidden="true">🔒</span> No Data Selling</span>
            <span className={styles.pillar}><span aria-hidden="true">🤖</span> AI-Free</span>
            <span className={styles.pillar}><span aria-hidden="true">📊</span> No Algorithms</span>
            <span className={styles.pillar}><span aria-hidden="true">👁️</span> No Shadowbans</span>
          </div>
        </div>
        
        <div className={styles.links}>
          <div className={styles.col}>
            <h4>{t('explore')}</h4>
            <Link href="/">{t('home')}</Link>
            <Link href="/projects">{t('projects')}</Link>
            <Link href="/products">{t('marketplace')}</Link>
            <Link href="/services">{t('services')}</Link>
            <Link href="/events">{t('events')}</Link>
          </div>
          
          <div className={styles.col}>
            <h4>{t('community')}</h4>
            <Link href="/community">{t('members')}</Link>
            <Link href="/community/groups">{t('groups')}</Link>
            <Link href="/community/forum">{t('forum')}</Link>
            <Link href="/requests">{t('requests')}</Link>
            <Link href="/hashtags">{t('hashtags')}</Link>
          </div>
          
          <div className={styles.col}>
            <h4>{t('support')}</h4>
            <Link href="/help">{t('help')}</Link>
            <Link href="/contact">{t('contact')}</Link>
            <Link href="/about">{t('about')}</Link>
            <Link href="/terms">{t('terms')}</Link>
            <Link href="/privacy">{t('privacy')}</Link>
          </div>
        </div>

        {donations.length > 0 && (
          <div className={styles.donations}>
            <h4>{t('supportThePlatform')}</h4>
            <div className={styles.donationPills}>
              {donations.map(da => {
                const price = prices[da.currency]
                return (
                  <button
                    key={da.id}
                    className={styles.donationPill}
                    onClick={() => openQr(da)}
                    aria-label={`Donate ${da.currency}`}
                  >
                    <img
                      src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`}
                      alt={da.currency}
                      className={styles.pillIcon}
                    />
                    <span className={styles.pillLabel}>{da.currency}</span>
                    {price != null && <span className={styles.pillPrice}>· {formatPrice(price, da.currency)}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        <div className={styles.bottom}>
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <div className={styles.bottomCenter}>
            <div className={styles.socialRow}>
              <a href="https://x.com/xistrymemz" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="X (Twitter)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://instagram.com/xistrymemz" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://github.com/yerbaforums/xistrymemz" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.746 1.023A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.906-1.293 2.745-1.023 2.745-1.023.546 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
            </div>
            <a href="https://github.com/yerbaforums/xistrymemz" target="_blank" rel="noopener noreferrer" className={styles.openSourceLink}>
              {t('openSource')}
            </a>
          </div>
          <div className={styles.bottomBuiltWith}>
            <span>{t('builtWith')}</span>
            <span className={styles.version}>v{PACKAGE_VERSION}</span>
            <span className={styles.hash}>@{GIT_HASH}</span>
          </div>
        </div>
      </div>

      {activeQr && (
        <QRCodeModal
          isOpen={true}
          onClose={closeQr}
          currency={activeQr.currency}
          address={activeQr.address}
        />
      )}
    </footer>
  )
}
