'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

const BREADCRUMB_LABELS: Record<string, string> = {
  overview: 'Overview',
  feed: 'Feed',
  projects: 'Projects',
  requests: 'Requests',
  marketplace: 'Marketplace',
  services: 'Services',
  rentals: 'Rentals',
  shop: 'Shop',
  teaching: 'Teaching',
  offers: 'Offers',
  events: 'Events',
  appointments: 'Planner',
  planning: 'Planning',
  saved: 'Saved',
}

function DashboardNav({ user }: { user: { name?: string | null; image?: string | null; username?: string | null } }) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const primaryNav = [
    { href: '/dashboard/overview', icon: '📊', label: 'Overview' },
    { href: '/dashboard/feed', icon: '📡', label: 'Feed' },
    { href: '/dashboard/marketplace', icon: '🛒', label: 'Marketplace' },
    { href: '/dashboard/services', icon: '🔧', label: 'Services' },
    { href: '/dashboard/rentals', icon: '🏠', label: 'Rentals' },
    { href: '/dashboard/shop', icon: '🏪', label: 'Shop' },
    { href: '/dashboard/events', icon: '📅', label: 'Events' },
    { href: '/dashboard/appointments', icon: '🗓️', label: 'Planner' },
    { href: '/dashboard/planning', icon: '🗺️', label: 'Planning' },
  ]

  const secondaryNav = [
    { href: '/dashboard/messages', icon: '💬', label: 'Messages' },
    { href: '/dashboard/community', icon: '🌐', label: 'Community' },
    { href: '/dashboard/projects', icon: '🚀', label: 'Projects' },
    { href: '/dashboard/requests', icon: '📝', label: 'Requests' },
    { href: '/dashboard/teaching', icon: '📚', label: 'Teaching' },
    { href: '/dashboard/offers', icon: '🤝', label: 'Offers' },
    { href: '/dashboard/saved', icon: '⭐', label: 'Saved' },
    { href: '/dashboard/video', icon: '📹', label: 'Video Chat' },
  ]

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
      {primaryNav.map(item => (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`${sidebarStyles.navItem} ${pathname === item.href ? sidebarStyles.active : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
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
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      console.error('Dashboard error:', event.error)
      setHasError(true)
    }
    window.addEventListener('error', handler)
    return () => window.removeEventListener('error', handler)
  }, [])

  if (hasError) {
    return (
      <div className={styles.errorState}>
        <h2>Something went wrong</h2>
        <p>An error occurred while loading the dashboard.</p>
        <button onClick={() => setHasError(false)} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    )
  }

  return <>{children}</>
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

  if (status === 'loading' || !onboardingChecked) {
    return (
      <div className={styles.layout}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading dashboard...</div>
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
    </div>
  )
}
