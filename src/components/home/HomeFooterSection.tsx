'use client'

import NewsletterSignup from '@/components/NewsletterSignup'
import styles from './HomeFooterSection.module.css'

export default function HomeFooterSection() {
  return (
    <section className={styles.section}>
      <NewsletterSignup />
    </section>
  )
}
