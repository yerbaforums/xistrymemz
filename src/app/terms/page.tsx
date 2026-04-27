'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function Terms() {
  return (
    <div className={styles.page}>
      <section className={styles.content}>
        <h1>Terms of Service</h1>
        <p className={styles.date}>Last updated: {new Date().toLocaleDateString()}</p>

        <div className={styles.section}>
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using XistrYmemZ, you accept and agree to be bound by the terms and provisions of this agreement.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Use License</h2>
          <p>
            Permission is granted to temporarily use XistrYmemZ for personal, non-commercial use only.
          </p>
        </div>

        <div className={styles.section}>
          <h2>User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any laws or regulations</li>
            <li>Infringe upon intellectual property rights</li>
            <li>Post harmful, offensive, or illegal content</li>
            <li>Attempt to gain unauthorized access to our systems</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Content</h2>
          <p>
            You retain ownership of content you create on our platform. By posting content, you grant us a license to display and distribute it.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Disclaimer</h2>
          <p>
            XistrYmemZ is provided "as is" without any warranties, express or implied.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Limitation of Liability</h2>
          <p>
            We shall not be liable for any indirect, incidental, or consequential damages.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use constitutes acceptance of changes.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Contact</h2>
          <p>Questions? Contact us at support@xistrymemz.com</p>
        </div>
      </section>
    </div>
  )
}