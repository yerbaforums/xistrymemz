'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuickCreate } from '@/components/QuickCreateModal'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const quickCreate = useQuickCreate()
  const isAuthenticated = status === 'authenticated'

  if (pathname?.startsWith('/auth')) return null

  const handleCreate = () => {
    if (isAuthenticated) {
      quickCreate.open()
    } else {
      router.push('/auth/login?callbackUrl=' + encodeURIComponent(pathname || '/'))
    }
  }

  const navItems = isAuthenticated ? [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🌐' },
    { href: null, label: 'Create', icon: '+', isFab: true, action: handleCreate },
    { href: '/dashboard/studio', label: 'Studio', icon: '🎨' },
    { href: `/${session?.user?.username || 'profile'}`, label: 'Profile', icon: '👤' },
  ] : [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🌐' },
    { href: null, label: 'Create', icon: '+', isFab: true, action: handleCreate },
    { href: '/community', label: 'Community', icon: '👥' },
    { href: '/auth/login', label: 'Sign In', icon: '🔑' },
  ]

  return (
    <nav className={styles.bottomNav} aria-label="Mobile navigation">
      {navItems.map(item => {
        if (item.isFab) {
          return (
            <button
              key={item.label}
              onClick={item.action}
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
  )
}
