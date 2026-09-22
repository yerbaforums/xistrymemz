'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuickCreate } from '@/components/QuickCreateModal'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import styles from './BottomNav.module.css'

interface NavItem {
  href: string | null
  label: string
  icon: string
  isFab?: boolean
  action?: () => void
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const quickCreate = useQuickCreate()
  const { isToolVisible } = useUserPreferences()
  const isAuthenticated = status === 'authenticated'

  if (pathname?.startsWith('/auth')) return null

  const handleCreate = () => {
    if (isAuthenticated) {
      quickCreate.open()
    } else {
      router.push('/auth/login?callbackUrl=' + encodeURIComponent(pathname || '/'))
    }
  }

  // Five slots max: Home, Discover, Create (FAB), Community, Profile/Sign In.
  // Photos lives in the sidebar/drawer under Community — it doesn't need its own
  // slot on a mobile bottom bar, so we avoid the duplicate-tab feel.
  const allItems: NavItem[] = isAuthenticated ? [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🌐' },
    { href: null, label: 'Create', icon: '+', isFab: true, action: handleCreate },
    { href: '/community', label: 'Members', icon: '👥' },
    { href: session?.user?.username ? `/profile/${session.user.username}` : '/profile', label: 'Profile', icon: '👤' },
  ] : [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🌐' },
    { href: null, label: 'Create', icon: '+', isFab: true, action: handleCreate },
    { href: '/community', label: 'Members', icon: '👥' },
    { href: '/auth/login', label: 'Sign In', icon: '🔑' },
  ]
  // Hidden tools disappear from the bottom bar too (except Home + Create).
  const navItems = allItems.filter(item => !item.href || item.href === '/' || isToolVisible(item.href))

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
        const getIsActive = () => {
          if (item.href === '/') return pathname === '/' || pathname === '/dashboard/overview'
          if (item.label === 'Profile') return pathname?.startsWith('/profile') || pathname?.startsWith('/settings')
          if (item.label === 'Members') return pathname?.startsWith('/community') || pathname?.startsWith('/connections')
          if (!item.href) return false
          return pathname === item.href || pathname?.startsWith(item.href + '/')
        }
        const isActive = getIsActive()
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
