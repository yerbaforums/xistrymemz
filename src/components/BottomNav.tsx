'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './BottomNav.module.css'

const QuickCreateModal = dynamic(() => import('@/components/QuickCreateModal'), { ssr: false })

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/discover', label: 'Discover', icon: '🌐' },
  { href: null, label: 'Create', icon: '+', isFab: true },
  { href: '/dashboard/messages', label: 'Messages', icon: '💬' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [showCreate, setShowCreate] = useState(false)

  if (status !== 'authenticated' || !session) return null
  if (pathname?.startsWith('/auth')) return null

  return (
    <>
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_ITEMS.map(item => {
          if (item.isFab) {
            return (
              <button
                key={item.label}
                onClick={() => setShowCreate(true)}
                className={styles.fabBtn}
                aria-label={item.label}
              >
                <span className={styles.fabIcon}>+</span>
              </button>
            )
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
      {showCreate && <QuickCreateModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
