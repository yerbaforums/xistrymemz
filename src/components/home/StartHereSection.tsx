'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './StartHereSection.module.css'

export default function StartHereSection() {
  const t = useTranslations('home')
  const { ref, visible } = useScrollReveal()

  const PATHS = [
    {
      icon: '🔧',
      title: t('startHereOfferTitle'),
      desc: t('startHereOfferDesc'),
      cta: t('startHereOfferCta'),
      href: '/dashboard/services',
    },
    {
      icon: '🔍',
      title: t('startHereFindTitle'),
      desc: t('startHereFindDesc'),
      cta: t('startHereFindCta'),
      href: '/services',
    },
    {
      icon: '🤝',
      title: t('startHereCollaborateTitle'),
      desc: t('startHereCollaborateDesc'),
      cta: t('startHereCollaborateCta'),
      href: '/community',
    },
  ]

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>{t('startHereTitle')}</h2>
      <p className={styles.sectionSubtitle}>{t('startHereSubtitle')}</p>
      <div className={styles.grid}>
        {PATHS.map(p => (
          <Link key={p.href + p.title} href={p.href} className={styles.card}>
            <span className={styles.icon}>{p.icon}</span>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <span className={styles.cta}>{p.cta} →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
