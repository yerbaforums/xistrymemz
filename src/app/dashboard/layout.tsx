'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/Header'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

function DashboardNav() {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/dashboard/overview', icon: '📊', label: 'Overview' },
    { href: '/dashboard/projects', icon: '🚀', label: 'Projects' },
    { href: '/dashboard/requests', icon: '📝', label: 'Requests' },
    { href: '/dashboard/marketplace', icon: '🛒', label: 'Marketplace' },
    { href: '/dashboard/events', icon: '📅', label: 'Events' },
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
        <Header />
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
      <Header />
      <div className={styles.container}>
        <DashboardNav />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
