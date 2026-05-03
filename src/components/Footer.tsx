'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Footer.module.css'
import { QRCodeModal } from './QRCodeModal'

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
  const [qrOpen, setQrOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/site/donations')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.addresses) setDonations(data.addresses) })
      .catch(() => {})
  }, [])

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr)
  }

  const openQr = (da: DonationAddr) => setQrOpen(da.id)
  const closeQr = () => setQrOpen(null)
  const activeQr = donations.find(d => d.id === qrOpen)

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
                <button onClick={() => openQr(da)} className={styles.qrBtn}>QR</button>
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
              <svg
                className={styles.githubIcon}
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.746 1.023A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.906-1.293 2.745-1.023 2.745-1.023.546 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Open Source
            </a>
            <span className={styles.version}>Built with OpenCode and Next.js · {PACKAGE_VERSION}</span>
          </div>
        </div>
      </div>

      {activeQr && (
        <QRCodeModal
          isOpen={true}
          onClose={closeQr}
          currency={activeQr.label || activeQr.currency}
          address={activeQr.address}
        />
      )}
    </footer>
  )
}
