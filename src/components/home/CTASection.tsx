'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './CTASection.module.css'

interface Props {
  memberCount: number
}

export default function CTASection({ memberCount }: Props) {
  const t = useTranslations('home')
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <h2>{t('ctaTitle')}</h2>
        <p>{t('ctaDesc', { count: memberCount })}</p>
        <div className={styles.actions}>
          <Link href="/auth/register" className={styles.btnPrimary}>
            {t('ctaSignUp')}
          </Link>
          <Link href="/plans/public" className={styles.btnSecondary}>
            {t('ctaBrowseProjects')}
          </Link>
        </div>
      </div>
    </section>
  )
}
