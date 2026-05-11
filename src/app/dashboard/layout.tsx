'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

function DashboardNav() {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/dashboard/overview', icon: '📊', label: 'Overview' },
    { href: '/dashboard/projects', icon: '🚀', label: 'Projects' },
    { href: '/dashboard/requests', icon: '📝', label: 'Requests' },
    { href: '/dashboard/marketplace', icon: '🛒', label: 'Marketplace' },
    { href: '/dashboard/rentals', icon: '🏠', label: 'Rentals' },
    { href: '/dashboard/teaching', icon: '🏫', label: 'Teaching' },
    { href: '/dashboard/offers', icon: '🤝', label: 'Offers' },
    { href: '/dashboard/events', icon: '📅', label: 'Events' },
    { href: '/saved', icon: '⭐', label: 'Saved' },
  ]

  return (
    <nav className={sidebarStyles.nav}>
      {navItems.map(item => (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`${sidebarStyles.navItem} ${pathname === item.href ? sidebarStyles.active : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  if (status === 'loading') {
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

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <DashboardNav />
        <main className={styles.main}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
