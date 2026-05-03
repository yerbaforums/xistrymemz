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
              Open Source
            </a>
            <span className={styles.version}>{PACKAGE_VERSION}</span>
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
