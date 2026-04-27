'use client'

import styles from './page.module.css'

export default function Privacy() {
  return (
    <div className={styles.page}>
      <section className={styles.content}>
        <h1>Privacy Policy</h1>
        <p className={styles.date}>Last updated: {new Date().toLocaleDateString()}</p>

        <div className={styles.section}>
          <h2>Data We Collect</h2>
          <p>We collect minimal data necessary to provide our services:</p>
          <ul>
            <li>Account information (email, name)</li>
            <li>Content you create (projects, posts, requests)</li>
            <li>Usage data for analytics</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>How We Use Data</h2>
          <p>Your data is used to:</p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Communicate with you</li>
            <li>Prevent abuse and ensure security</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Data Sharing</h2>
          <p>We do not sell your personal data. We may share data with:</p>
          <ul>
            <li>Service providers (hosting, analytics)</li>
            <li>Legal authorities when required</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Your Rights</h2>
          <p>You can:</p>
          <ul>
            <li>Access your data</li>
            <li>Delete your account</li>
            <li>Export your data</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Contact</h2>
          <p>Questions? Contact us at support@xistrymemz.com</p>
        </div>
      </section>
    </div>
  )
}