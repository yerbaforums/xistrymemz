'use client'

import Link from 'next/link'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './CTASection.module.css'

interface Props {
  memberCount: number
}

export default function CTASection({ memberCount }: Props) {
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <h2>Ready to Claim Your Place?</h2>
        <p>
          Join <strong className={styles.count}>{memberCount.toLocaleString()}</strong> other members
          on the cosmic whitepages cooperative. Create your profile, launch your first project,
          and start connecting with people who share your vision.
        </p>
        <div className={styles.actions}>
          <Link href="/auth/register" className={styles.btnPrimary}>
            Sign Up &amp; Start Building
          </Link>
          <Link href="/plans/public" className={styles.btnSecondary}>
            Browse Projects
          </Link>
        </div>
      </div>
    </section>
  )
}
