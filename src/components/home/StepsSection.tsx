'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './StepsSection.module.css'

const STEPS = [
  { num: '01', title: 'Sign Up', desc: 'Create your account and claim your cosmic identity. No barriers, no gatekeeping.' },
  { num: '02', title: 'Build Your Profile', desc: 'Add your bio, links, shop, school. Make yourself findable in the whitepages.' },
  { num: '03', title: 'Connect & Create', desc: 'Join the network. Start projects, make requests, find collaborators.' },
  { num: '04', title: 'Grow Together', desc: 'Build reputation, earn trust, expand your reach. The coop grows with you.' },
]

export default function StepsSection() {
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>How It Works</h2>
      <p className={styles.sectionSubtitle}>Four steps to join the cooperative</p>
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
