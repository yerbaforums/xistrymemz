'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Skeleton from '@/components/Skeleton'
import styles from './layout.module.css'
import sidebarStyles from './layout-sidebar.module.css'

function CommunityNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  const navItems = [
    { href: '/community', icon: '👤', label: 'Members' },
    { href: '/community/forum', icon: '💬', label: 'Forum' },
    { href: '/community/groups', icon: '👥', label: 'Groups' },
    { href: '/connections', icon: '🔗', label: 'Connections' },
    { href: '/boards', icon: '📌', label: 'Boards' },
  ]

  const isActive = (href: string) => {
    if (href === '/community') {
      return pathname === '/community'
    }
    return pathname?.startsWith(href)
  }

  const user = session?.user
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
          <Skeleton width="100%" height="2rem" />
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
