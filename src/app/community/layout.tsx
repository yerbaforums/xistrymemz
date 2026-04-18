'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

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
        <CommunityNav />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
