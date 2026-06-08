'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import NewsletterSignup from '@/components/NewsletterSignup'
import styles from './HomeFooterSection.module.css'

export default function HomeFooterSection() {
  const t = useTranslations('homeFooter')
  return (
    <section className={styles.section}>
      <NewsletterSignup />
      <div className={styles.links}>
        <Link href="/about">{t('about')}</Link>
        <Link href="/help">{t('help')}</Link>
        <Link href="/community">{t('community')}</Link>
        <Link href="/community/forum">{t('forum')}</Link>
        <Link href="/requests">{t('requests')}</Link>
        <Link href="/privacy">{t('privacy')}</Link>
        <Link href="/terms">{t('terms')}</Link>
      </div>
      <p className={styles.copyright}>{t('copyright', { year: new Date().getFullYear() })}</p>
    </section>
  )
}
