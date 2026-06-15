'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { NAV, DASHBOARD_SIDEBAR_PRIMARY, DASHBOARD_SIDEBAR_SECONDARY } from '@/lib/navigation'
import { useQuickCreate } from '@/components/QuickCreateModal'
import styles from './NavSidebar.module.css'

export default function NavSidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const quickCreate = useQuickCreate()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('navSidebarCollapsed') === 'true'
    }
    return false
  })
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const profileRef = useRef<HTMLDivElement>(null)

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev)
  }, [])

  useEffect(() => {
    window.addEventListener('sidebar-toggle', toggleCollapsed)
    return () => window.removeEventListener('sidebar-toggle', toggleCollapsed)
  }, [toggleCollapsed])

  useEffect(() => {
    localStorage.setItem('navSidebarCollapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/messages/conversations')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const total = (data?.conversations || []).reduce((sum: number, c: { unreadCount: number }) => sum + (c.unreadCount || 0), 0)
          setUnreadCount(total)
        })
        .catch(() => {})
    }
  }, [session?.user?.id])

  if (pathname?.startsWith('/auth')) return null

  const isStudio = pathname?.startsWith('/dashboard')
  const isAuthenticated = status === 'authenticated'

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(href)
  }

  const user = session?.user
  const userInitial = (user?.name || 'U')[0].toUpperCase()
  const profileHref = `/profile/${user?.username || ''}`

  const showShortcut = (i: number) => {
    if (collapsed) return null
    if (i < 9) return <span className={styles.shortcut}>Alt+{i + 1}</span>
    if (i === 9) return <span className={styles.shortcut}>Alt+0</span>
    return null
  }

  return (
    <nav className={`${styles.nav} ${collapsed ? styles.collapsed : ''}`}>
      <button
        className={styles.toggle}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '▶' : '◀'}
      </button>

      {isStudio && isAuthenticated ? (
        <>
          <div className={styles.profileStripWrapper} ref={profileRef}>
            <button className={styles.profileStrip} onClick={() => setProfileOpen(!profileOpen)}>
              <div className={styles.profileAvatar}>
                {user?.image ? (
                  <Image src={user.image} alt={user.name || 'User'} width={36} height={36} className={styles.profileAvatarImg} />
                ) : (
                  <span className={styles.profileAvatarInitial}>{userInitial}</span>
                )}
              </div>
              {!collapsed && <span className={styles.profileName}>{user?.name || 'User'}</span>}
            </button>
            {profileOpen && !collapsed && (
              <div className={styles.profileDropdown}>
                <Link href={profileHref} className={styles.profileDropdownLink} onClick={() => setProfileOpen(false)}>My Profile</Link>
                <Link href="/dashboard/settings" className={styles.profileDropdownLink} onClick={() => setProfileOpen(false)}>Settings</Link>
                <Link href="/auth/logout" className={styles.profileDropdownLink} onClick={() => setProfileOpen(false)}>Sign Out</Link>
              </div>
            )}
          </div>
          <div className={styles.divider} />
          {DASHBOARD_SIDEBAR_PRIMARY.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {showShortcut(i)}
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={styles.moreToggle}
            title={collapsed ? (moreOpen ? 'Collapse More' : 'Expand More') : undefined}
          >
            <span>{moreOpen ? '▼' : '▶'}</span>
            {!collapsed && <span>More</span>}
          </button>
          {moreOpen && (
            <div className={styles.moreSection}>
              {DASHBOARD_SIDEBAR_SECONDARY.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                >
                  <span>{item.icon}</span>
                  {!collapsed && (
                    <span>
                      {item.label}
                      {item.label === 'Messages' && unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                      )}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <div className={styles.divider} />
          <Link href="/" className={styles.switchMode} title={collapsed ? 'Browse' : undefined}>
            <span>🌐</span>
            {!collapsed && <span>Browse</span>}
          </Link>
        </>
      ) : (
        <>
          {!collapsed && <div className={styles.sectionHeader}>Explore</div>}
          {NAV.explore.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
          {!collapsed && <div className={styles.sectionHeader}>Community</div>}
          {NAV.community.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <div className={styles.divider} />
              <Link href="/dashboard/studio" className={styles.switchMode} title={collapsed ? 'Studio' : undefined}>
                <span>🎨</span>
                {!collapsed && <span>Studio</span>}
              </Link>
            </>
          ) : (
            <>
              <div className={styles.divider} />
              <Link href="/about" className={styles.navItem} title={collapsed ? 'About' : undefined}>
                <span>📄</span>
                {!collapsed && <span>About</span>}
              </Link>
              <Link href="/help" className={styles.navItem} title={collapsed ? 'Help' : undefined}>
                <span>❓</span>
                {!collapsed && <span>Help</span>}
              </Link>
            </>
          )}
        </>
      )}

      {isAuthenticated && (
        <>
          <div className={styles.divider} />
          <button
            onClick={() => quickCreate.open()}
            className={styles.createBtn}
            title={collapsed ? 'Quick Create' : undefined}
          >
            <span>✨</span>
            {!collapsed && <span>Quick Create</span>}
          </button>
        </>
      )}
    </nav>
  )
}
