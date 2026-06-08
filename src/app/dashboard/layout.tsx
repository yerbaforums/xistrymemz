'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SkeletonCard } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import DashboardTourWrapper from '@/components/DashboardTourWrapper'
import { DASHBOARD_SIDEBAR_PRIMARY, DASHBOARD_SIDEBAR_SECONDARY, BREADCRUMB_LABELS } from '@/lib/navigation'
import { dashboardShortcuts } from '@/lib/shortcuts'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

function DashboardNav({ user }: { user: { id?: string | null; name?: string | null; image?: string | null; username?: string | null } }) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) return
    fetch('/api/messages/conversations')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const total = (data?.conversations || []).reduce((sum: number, c: { unreadCount: number }) => sum + (c.unreadCount || 0), 0)
        setUnreadCount(total)
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const primaryNav = DASHBOARD_SIDEBAR_PRIMARY
  const secondaryNav = DASHBOARD_SIDEBAR_SECONDARY

  const userInitial = (user?.name || 'U')[0].toUpperCase()
  const profileHref = `/profile/${user?.username || ''}`

  return (
    <nav className={sidebarStyles.nav}>
      <div className={sidebarStyles.profileStripWrapper} ref={dropdownRef}>
        <button className={sidebarStyles.profileStrip} onClick={() => setDropdownOpen(!dropdownOpen)}>
          <div className={sidebarStyles.profileAvatar}>
            {user?.image ? (
              <Image src={user.image} alt={user.name || 'User'} width={36} height={36} className={sidebarStyles.profileAvatarImg} />
            ) : (
              <span className={sidebarStyles.profileAvatarInitial}>{userInitial}</span>
            )}
          </div>
          <div className={sidebarStyles.profileName}>{user?.name || 'User'}</div>
        </button>
        {dropdownOpen && (
          <div className={sidebarStyles.profileDropdown}>
            <Link href={profileHref} className={sidebarStyles.profileDropdownLink} onClick={() => setDropdownOpen(false)}>My Profile</Link>
            <Link href="/dashboard/settings" className={sidebarStyles.profileDropdownLink} onClick={() => setDropdownOpen(false)}>Settings</Link>
            <button className={sidebarStyles.profileDropdownLink} onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: '/auth/login' }) }}>Sign Out</button>
          </div>
        )}
      </div>
      <div className={sidebarStyles.navDivider} />
      {primaryNav.map((item, i) => (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`${sidebarStyles.navItem} ${pathname === item.href ? sidebarStyles.active : ''}`}
          aria-label={item.label}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          {i < 9 && <span className={sidebarStyles.shortcut}>Alt+{i + 1}</span>}
        </Link>
      ))}
      <button onClick={() => setMoreOpen(!moreOpen)} className={sidebarStyles.moreToggle}>
        <span>{moreOpen ? '▼' : '▶'}</span>
        <span>More</span>
      </button>
      {moreOpen && (
        <div className={sidebarStyles.moreSection}>
          {secondaryNav.map(item => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`${sidebarStyles.navItem} ${pathname === item.href ? sidebarStyles.active : ''}`}
              aria-label={item.label}
            >
              <span>{item.icon}</span>
              <span>
                {item.label}
                {item.label === 'Messages' && unreadCount > 0 && (
                  <span style={{ marginLeft: 8, background: 'var(--accent-primary)', color: 'var(--bg-primary)', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>{unreadCount}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    fetch('/api/users/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.onboardingCompleted === false) {
          // Don't redirect if user has previously dismissed setup
          if (data?.user?.setupProgress) {
            try {
              const progress = JSON.parse(data.user.setupProgress)
              if (progress.setupDismissed) {
                setOnboardingChecked(true)
                return
              }
            } catch {}
          }
          router.push('/onboarding')
        } else {
          setOnboardingChecked(true)
        }
      })
      .catch(() => setOnboardingChecked(true))
  }, [status, session, router])

  useEffect(() => {
    return dashboardShortcuts((href) => router.push(href))
  }, [router])

  if (status === 'loading' || !onboardingChecked) {
    return (
      <div className={styles.layout}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const pageLabel = BREADCRUMB_LABELS[segments[1]] || segments[1]?.replace(/^./, c => c.toUpperCase()) || 'Dashboard'

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <DashboardNav user={session.user} />
        <main className={styles.main}>
          <nav className={styles.breadcrumbs}>
            <Link href="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
            {pageLabel !== 'Dashboard' && (
              <>
                <span className={styles.breadcrumbSep}> / </span>
                <span className={styles.breadcrumbCurrent}>{pageLabel}</span>
              </>
            )}
          </nav>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <DashboardTourWrapper />
    </div>
  )
}
