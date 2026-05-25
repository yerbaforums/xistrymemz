'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTranslations } from 'next-intl'
import styles from './StepsSection.module.css'

export default function StepsSection() {
  const { ref, visible } = useScrollReveal()
  const t = useTranslations('home')

  const STEPS = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc') },
    { num: '02', title: t('step2Title'), desc: t('step2Desc') },
    { num: '03', title: t('step3Title'), desc: t('step3Desc') },
    { num: '04', title: t('step4Title'), desc: t('step4Desc') },
  ]

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>{t('stepsTitle')}</h2>
      <p className={styles.sectionSubtitle}>{t('stepsSubtitle')}</p>
      <div className={styles.grid}>
        {STEPS.map((step, i) => (
          <div key={step.num} className={styles.card}>
            <div className={styles.num}>{step.num}</div>
            <div className={styles.dotRow}>
              {STEPS.map((_, j) => (
                <span key={j} className={`${styles.dot} ${j <= i ? styles.dotActive : ''}`} />
              ))}
            </div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
