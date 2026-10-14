'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Breadcrumbs from '@/components/Breadcrumbs'
import AvailabilityEditor from '@/components/AvailabilityEditor'
import styles from './page.module.css'

export default function AvailabilityPage() {
  const { data: session, status } = useSession()
  const [timeZone, setTimeZone] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/users/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const user = data?.user || data?.data?.user
        if (user) setTimeZone(user.timeZone || null)
      })
      .catch(() => {})
  }, [status])

  const userId = session?.user?.id

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Availability' },
        ]} />

        <h1 className={styles.title}>🗓️ Availability</h1>
        <p className={styles.subtitle}>
          Set the days and hours you accept appointments. Buyers only see slots inside
          these windows when booking you.
        </p>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            🕒 Times are in <strong>{timeZone || 'your local timezone'}</strong>
          </span>
          <Link href="/profile/edit" className={styles.metaLink}>Change timezone</Link>
        </div>

        <div className={styles.notice}>
          <span>💡 Enable appointments on a
            {' '}<Link href="/dashboard/services">service</Link> or
            {' '}<Link href="/dashboard/marketplace">listing</Link> to start taking bookings.
          </span>
        </div>

        <div className={styles.card}>
          {userId ? (
            <AvailabilityEditor userId={userId} showHeading={false} />
          ) : (
            <p className={styles.loading}>Loading…</p>
          )}
        </div>

        <p className={styles.footnote}>
          Bookings you receive show up in <Link href="/dashboard/appointments">Appointments</Link>.
        </p>
      </div>
    </div>
  )
}
