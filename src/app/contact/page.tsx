'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function Contact() {
  const t = useTranslations('contact')
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.message) return

    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        setStatus('success')
        setStatusMessage(t('successMsg'))
        setForm({ name: '', email: '', subject: '', message: '', website: '' })
      } else {
        setStatus('error')
        setStatusMessage(t('errorMsg'))
      }
    } catch {
      setStatus('error')
      setStatusMessage(t('errorMsg'))
    }
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: t('breadcrumb') },
      ]} />
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1>{t('title')}</h1>
          <p className={styles.heroSubtitle}>
            {t('subtitle')}
          </p>
        </section>

        <div className={styles.content}>
          <div className={styles.info}>
            <div className={styles.infoCard}>
              <h3>{t('cardGeneralTitle')}</h3>
              <p>{t('cardGeneralDesc')}</p>
              <span className={styles.infoHint}>{t('cardHint')}</span>
            </div>

            <div className={styles.infoCard}>
              <h3>{t('cardSupportTitle')}</h3>
              <p>{t('cardSupportDesc')}</p>
              <span className={styles.infoHint}>{t('cardHint')}</span>
            </div>

            <div className={styles.infoCard}>
              <h3>{t('cardReportTitle')}</h3>
              <p>{t('cardReportDesc')}</p>
              <span className={styles.infoHint}>{t('cardHint')}</span>
            </div>

            <div className={styles.infoCard}>
              <h3>{t('cardJoinTitle')}</h3>
              <p>{t('cardJoinDesc')}</p>
              <div className={styles.socialLinks}>
                <Link href="/community">Community</Link>
                <Link href="/events">Events</Link>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <h2>{t('formTitle')}</h2>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>{t('labelName')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('phName')}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('labelEmail')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>{t('labelSubject')}</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">{t('optTopic')}</option>
                <option value="general">{t('optGeneral')}</option>
                <option value="support">{t('optSupport')}</option>
                <option value="bug">{t('optBug')}</option>
                <option value="feature">{t('optFeature')}</option>
                <option value="partnership">{t('optPartnership')}</option>
                <option value="feedback">{t('optFeedback')}</option>
                <option value="other">{t('optOther')}</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>{t('labelMessage')}</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={t('phMessage')}
                rows={6}
                required
              />
            </div>

            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              style={{ position: 'absolute', left: -9999, opacity: 0 }}
              tabIndex={-1}
              autoComplete="off"
            />

            <button type="submit" className={styles.submitBtn} disabled={status === 'loading'}>
              {status === 'loading' ? t('sending') : t('submit')}
            </button>

            {statusMessage && (
              <p className={status === 'success' ? styles.successMsg : styles.errorMsg}>
                {statusMessage}
              </p>
            )}
          </form>
        </div>

        <section className={styles.faq}>
          <h2>{t('faqTitle')}</h2>
          <div className={styles.faqGrid}>
            <Link href="/help" className={styles.faqItem}>
              <h3>{t('qa1Title')}</h3>
              <p>{t('qa1Desc')}</p>
            </Link>
            <Link href="/help" className={styles.faqItem}>
              <h3>{t('qa2Title')}</h3>
              <p>{t('qa2Desc')}</p>
            </Link>
            <Link href="/help" className={styles.faqItem}>
              <h3>{t('qa3Title')}</h3>
              <p>{t('qa3Desc')}</p>
            </Link>
            <Link href="/help" className={styles.faqItem}>
              <h3>{t('qa4Title')}</h3>
              <p>{t('qa4Desc')}</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
