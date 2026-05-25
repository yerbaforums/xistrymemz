'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './PassportSection.module.css'

export default function PassportSection() {
  const t = useTranslations('home')
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <div className={styles.icon}>🌍</div>
        <h2 className={styles.title}>{t('passportTitle')}</h2>
        <p className={styles.subtitle}>{t('passportSubtitle')}</p>
        <div className={styles.cards}>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🪪</span>
            <h4>{t('passportUniversalRef')}</h4>
            <p>{t('passportUniversalRefDesc')}</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>⭐</span>
            <h4>{t('passportReputation')}</h4>
            <p>{t('passportReputationDesc')}</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>📍</span>
            <h4>{t('passportLocation')}</h4>
            <p>{t('passportLocationDesc')}</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🎭</span>
            <h4>{t('passportUserClasses')}</h4>
            <p>{t('passportUserClassesDesc')}</p>
          </div>
        </div>
        <Link href="/profile/edit" className={styles.cta}>
          {t('passportCta')}
        </Link>
      </div>
    </section>
  )
}
