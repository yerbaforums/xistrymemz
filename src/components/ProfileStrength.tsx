'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Skeleton from '@/components/Skeleton'
import styles from './ProfileStrength.module.css'

export default function ProfileStrength() {
  const { data: session } = useSession()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/users/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setUser(data?.user || null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  if (loading) return null
  if (!user) return null

  const checks = [
    { key: 'name', label: 'Display Name', done: !!user.name, href: '/profile/edit' },
    { key: 'bio', label: 'Bio', done: !!user.bio, href: '/profile/edit' },
    { key: 'image', label: 'Profile Photo', done: !!user.image, href: '/profile/edit' },
    { key: 'location', label: 'Location', done: !!user.latitude && !!user.longitude, href: '/dashboard/passport' },
    { key: 'class', label: 'User Class', done: !!user.userClass, href: '/onboarding' },
    { key: 'shop', label: 'Shop or School', done: !!(user.shopSlug || user.schoolSlug), href: '/templates' },
  ]

  const done = checks.filter(c => c.done).length
  const total = checks.length
  const pct = Math.round((done / total) * 100)
  const missing = checks.filter(c => !c.done)

  if (pct >= 80) return null

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Profile Strength</span>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {missing.length > 0 && (
        <div className={styles.missing}>
          {missing.slice(0, 3).map(m => (
            <Link key={m.key} href={m.href} className={styles.item}>
              <span className={styles.dot} /> {m.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
