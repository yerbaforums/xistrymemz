'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Footer.module.css'

const PACKAGE_VERSION = '0.7.0'

const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'bitcoin.png',
  ETH: 'ethereum.png',
  USDT: 'tether.png',
  USDC: 'usd-coin.png',
  XMR: 'monero.png',
  XTM: 'tari.png',
  ARRR: 'pirate-chain.png',
  DERO: 'dero.png',
  ZANO: 'zano.png',
}

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
}

export default function Footer() {
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
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>XistrYmemZ</Link>
          <p>Plan. Request. Complete.</p>
        </div>
        
        <div className={styles.links}>
          <div className={styles.col}>
            <h4>Explore</h4>
            <Link href="/">Home</Link>
            <Link href="/plans/public">Projects</Link>
            <Link href="/products">Market</Link>
            <Link href="/events">Events</Link>
          </div>
          
          <div className={styles.col}>
            <h4>Community</h4>
            <Link href="/community">Members</Link>
            <Link href="/groups">Groups</Link>
            <Link href="/requests">Requests</Link>
          </div>
          
          <div className={styles.col}>
            <h4>Support</h4>
            <Link href="/help">Help</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/about">About</Link>
          </div>
        </div>

        {donations.length > 0 && (
          <div className={styles.donations}>
            <h4>Support the Platform</h4>
            {donations.map(da => (
              <p key={da.id} className={styles.donationRow}>
                <img
                  src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`}
                  alt={da.currency}
                  className={styles.donationIcon}
                />
                <span className={styles.donationLabel}>{da.label || da.currency}:</span>
                <code className={styles.donationAddr}>{da.address}</code>
                <button onClick={() => copyAddress(da.address)} className={styles.copyBtn}>Copy</button>
              </p>
            ))}
          </div>
        )}
        
        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} XistrYmemZ</p>
          <div className={styles.bottomCenter}>
            <a
              href="https://github.com/yerbaforums/xistrymemz"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openSourceLink}
            >
              <svg className={styles.githubIcon} viewBox="0 0 16 16" width="14" height="14">
                <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                  0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
                  1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
                  0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 1.2.27.4-.11.87-.17 1.33-.17.46
                  0 .93.06 1.33.17.53-.48 1.2-.27 1.2-.27.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15
                  0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013
                  8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>Open Source v{PACKAGE_VERSION}</span>
            </a>
          </div>
          <div className={styles.legal}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
