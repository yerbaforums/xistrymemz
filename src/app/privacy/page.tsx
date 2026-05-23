'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function Privacy() {
  return (
    <div className={styles.page}>
      <section className={styles.content}>
        <h1>Privacy Policy</h1>
        <p className={styles.date}>Last updated: January 1, 2025</p>

        <div className={styles.section}>
          <h2>Data We Collect</h2>
          <p>We collect minimal data necessary to provide our services:</p>
          <ul>
            <li><strong>Account information:</strong> Email, name, username, profile picture, and bio you provide during registration and profile setup.</li>
            <li><strong>Content you create:</strong> Projects, plans, posts, requests, events, service listings, product listings, group content, and forum posts.</li>
            <li><strong>Location data:</strong> Neighborhood and search radius preferences you voluntarily provide for local discovery features.</li>
            <li><strong>Transaction data:</strong> Offer history, appointment bookings, and marketplace activity between you and other users.</li>
            <li><strong>Cryptocurrency addresses:</strong> Wallet addresses you voluntarily provide for receiving donations. These are public by nature.</li>
            <li><strong>Usage data:</strong> Page views, feature interactions, and analytics to improve the platform.</li>
            <li><strong>Communication data:</strong> Messages between users and notification preferences.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>How We Use Data</h2>
          <p>Your data is used to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Enable content discovery and local recommendations</li>
            <li>Facilitate communication between users (messaging, notifications)</li>
            <li>Process appointments, offers, and marketplace transactions</li>
            <li>Send relevant notifications about activity on your content</li>
            <li>Prevent abuse, spam, and ensure platform security</li>
            <li>Analyze usage patterns to improve features and user experience</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Data Sharing</h2>
          <p>We do not sell your personal data to third parties. We may share data with:</p>
          <ul>
            <li><strong>Service providers:</strong> Hosting, analytics, and email delivery partners who help operate the platform.</li>
            <li><strong>Other users:</strong> Your public profile, listings, and content are visible to other users as intended by the platform&apos;s features.</li>
            <li><strong>Legal authorities:</strong> When required by law, regulation, or legal process.</li>
          </ul>
          <p>Cryptocurrency wallet addresses you share for donations are public by nature and may be visible to anyone who views your profile or content.</p>
        </div>

        <div className={styles.section}>
          <h2>Video Chat</h2>
          <p>
            Video chat uses peer-to-peer WebRTC connections. Audio and video streams are sent directly between participants and are not stored on our servers. We do not record, monitor, or store video chat content. Connection metadata (room creation and participant joining) is retained for room management purposes.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, though some anonymized usage data may be retained for analytics. Public content you have created may be retained in anonymized form.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We may use analytics cookies to understand how the platform is used. You can control cookie settings in your browser.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Your Rights</h2>
          <p>You can:</p>
          <ul>
            <li><strong>Access your data:</strong> View and download your profile, content, and account information at any time.</li>
            <li><strong>Delete your account:</strong> Request permanent deletion of your account and associated data.</li>
            <li><strong>Export your data:</strong> Download a copy of your content and account information.</li>
            <li><strong>Update your information:</strong> Edit your profile, preferences, and settings at any time.</li>
            <li><strong>Opt out of communications:</strong> Manage notification preferences in your settings.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Security</h2>
          <p>
            We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and secure session management. However, no system is completely secure. We encourage you to use strong passwords and not share your credentials.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Children&apos;s Privacy</h2>
          <p>
            XistrYmemZ is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected data from a child under 13, we will delete it promptly.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this privacy policy periodically. Material changes will be communicated through the platform. Continued use after changes constitutes acceptance of the revised policy.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Contact</h2>
          <p>Questions about this privacy policy? Contact us through our <Link href="/contact" style={{ color: 'var(--accent-primary)' }}>contact page</Link>.</p>
        </div>
      </section>
    </div>
  )
}