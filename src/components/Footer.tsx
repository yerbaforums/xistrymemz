'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Footer.module.css'

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
            <Link href="/plans/public">Projects</Link>
            <Link href="/products">Market</Link>
            <Link href="/events">Events</Link>
          </div>
          
          <div className={styles.col}>
            <h4>Community</h4>
            <Link href="/community">Members</Link>
            <Link href="/groups">Groups</Link>
            <Link href="/requests/public">Requests</Link>
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
                <span className={styles.donationLabel}>{da.label || da.currency}:</span>
                <code className={styles.donationAddr}>{da.address}</code>
                <button onClick={() => copyAddress(da.address)} className={styles.copyBtn}>Copy</button>
              </p>
            ))}
          </div>
        )}
        
        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} XistrYmemZ</p>
          <div className={styles.legal}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
