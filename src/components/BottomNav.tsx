'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/dashboard/feed', label: 'Feed', icon: '📡' },
  { href: null, label: 'Create', icon: '+', isFab: true },
  { href: '/dashboard/messages', label: 'Messages', icon: '💬' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (status !== 'authenticated' || !session) return null
  if (pathname?.startsWith('/auth')) return null

  return (
    <nav className={styles.bottomNav} aria-label="Mobile navigation">
      {NAV_ITEMS.map(item => {
        if (item.isFab) {
          return <div key={item.label} className={styles.fabSpacer} />
        }
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link
            key={item.label}
            href={item.href || '#'}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            aria-label={item.label}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
