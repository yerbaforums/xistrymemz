'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
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

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr)
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img src="/logo.png" alt="XistrYmemZ" className={styles.logo} />
        <h1>XistrYmemZ</h1>
        <p>A community platform for planning, requesting, and completing projects together.</p>
      </section>

      <section className={styles.content}>
        <div className={styles.block}>
          <h2>What we do</h2>
          <p>
            We connect creators, developers, and community members to collaborate on projects.
            Create plans, submit requests, and track progress — together.
          </p>
        </div>

        <div className={styles.block}>
          <h2>Get started</h2>
          <div className={styles.links}>
            <Link href="/auth/register">Create account</Link>
            <Link href="/plans/public">Browse projects</Link>
            <Link href="/community">Join community</Link>
          </div>
        </div>

        {donations.length > 0 && (
          <div className={styles.block}>
            <h2>Support XistrYmemZ</h2>
            <p>Help us keep the platform free and independent</p>
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
                  <code className={styles.donationAddr}>{da.address}</code>
                  <button onClick={() => copyAddress(da.address)} className={styles.copyBtn}>Copy</button>
                  <button onClick={() => setQrOpen(da)} className={styles.copyBtn}>QR</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.block}>
          <h2>Support</h2>
          <p>Open source. Built with Next.js.</p>
          <div className={styles.links}>
            <Link href="/help">Help center</Link>
            <Link href="/contact">Contact</Link>
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
