'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, Component, ErrorInfo, ReactNode } from 'react'
import Link from 'next/link'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('Community ErrorBoundary:', error, errorInfo) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Refresh Page</button>
        </div>
      )
    }
    return this.props.children
  }
}

function CommunityNav() {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/community', icon: '👤', label: 'Members' },
    { href: '/community/forum', icon: '💬', label: 'Forum' },
    { href: '/community/groups', icon: '👥', label: 'Groups' },
  ]

  const isActive = (href: string) => {
    if (href === '/community') {
      return pathname === '/community'
    }
    return pathname?.startsWith(href)
  }

  return (
    <nav className={sidebarStyles.nav}>
      {navItems.map(item => (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`${sidebarStyles.navItem} ${isActive(item.href) ? sidebarStyles.active : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export default function CommunityLayout({
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
          <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
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
        <CommunityNav />
        <main className={styles.main}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
