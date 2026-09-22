'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { NAV, DASHBOARD_SIDEBAR, EXPLORE_GROUPS, STUDIO_GROUPS } from '@/lib/navigation'
import { useQuickCreate } from '@/components/QuickCreateModal'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import Avatar from '@/components/Avatar'
import styles from './NavSidebar.module.css'

export default function NavSidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const quickCreate = useQuickCreate()
  const { isToolVisible } = useUserPreferences()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [query, setQuery] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev)
  }, [])

  useEffect(() => {
    window.addEventListener('sidebar-toggle', toggleCollapsed)
    return () => window.removeEventListener('sidebar-toggle', toggleCollapsed)
  }, [toggleCollapsed])

  useEffect(() => {
    const initializeCollapsed = async () => {
      const stored = localStorage.getItem('navSidebarCollapsed')
      if (stored === 'true') setCollapsed(true)
      setMounted(true)
    }
    initializeCollapsed()
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('navSidebarCollapsed', String(collapsed))
  }, [collapsed, mounted])

  // Persisted per-group collapse; auto-open the group holding the active route.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('navSidebarGroups') || '{}')
      if (stored && typeof stored === 'object') setOpenGroups(stored)
    } catch {}
    setGroupsLoaded(true)
  }, [])

  useEffect(() => {
    if (!groupsLoaded) return
    localStorage.setItem('navSidebarGroups', JSON.stringify(openGroups))
  }, [openGroups, groupsLoaded])

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))
  }

  const isGroupOpen = (key: string, hrefs: string[]) => {
    if (pathname && hrefs.some(h => pathname === h || pathname?.startsWith(h + '/'))) return true
    return openGroups[key] ?? true
  }

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
  const profileHref = `/profile/${user?.username || ''}`

  // Sidebar quick-search ("Find a page") — filters every nav item flat.
  const q = query.trim().toLowerCase()
  const matchesNav = (label: string, href: string) =>
    !q || label.toLowerCase().includes(q) || href.toLowerCase().includes(q)
  const studioPrimary = DASHBOARD_SIDEBAR.filter(item => item.section === 'primary' && isToolVisible(item.href))
  const studioMatches = DASHBOARD_SIDEBAR.filter(item => isToolVisible(item.href) && matchesNav(item.label, item.href))
  const exploreList = [...NAV.explore, ...NAV.community]
  const exploreMatches = exploreList.filter(item => isToolVisible(item.href) && matchesNav(item.label, item.href))

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

      {!collapsed && (
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">🔎</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Find a page..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Find a page"
          />
          {query && (
            <button type="button" className={styles.searchClear} onClick={() => setQuery('')} aria-label="Clear search">✕</button>
          )}
        </div>
      )}

      {isStudio && isAuthenticated ? (
        <>
          <div className={styles.profileStripWrapper} ref={profileRef}>
            <button className={styles.profileStrip} onClick={() => setProfileOpen(!profileOpen)}>
              <div className={styles.profileAvatar}>
                <Avatar src={user?.image} name={user?.name} size={36} />
              </div>
              {!collapsed && <span className={styles.profileName}>{user?.name || 'User'}</span>}
            </button>
            {profileOpen && !collapsed && (
              <div className={styles.profileDropdown}>
                <Link href={profileHref} className={styles.profileDropdownLink} onClick={() => setProfileOpen(false)}>My Profile</Link>
                <Link href="/dashboard/settings" className={styles.profileDropdownLink} onClick={() => setProfileOpen(false)}>Settings</Link>
                <button className={styles.profileDropdownLink} onClick={() => { setProfileOpen(false); signOut({ callbackUrl: '/' }) }}>Sign Out</button>
              </div>
            )}
          </div>
          <div className={styles.divider} />
          {q ? (
            <div className={styles.searchResults}>
              {studioMatches.map(item => {
                const pIdx = item.section === 'primary' ? studioPrimary.findIndex(p => p.href === item.href) : -1
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                    aria-label={item.label}
                  >
                    <span>{item.icon}</span>
                    <span>
                      {item.label}
                      {item.label === 'Messages' && unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                      )}
                    </span>
                    {pIdx >= 0 && showShortcut(pIdx)}
                  </Link>
                )
              })}
              {studioMatches.length === 0 && (
                <div className={styles.noResults}>No pages match “{query.trim()}”</div>
              )}
            </div>
          ) : (
            <>
              {studioPrimary.map((item, i) => (
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
                  {STUDIO_GROUPS.map(group => {
                    const items = DASHBOARD_SIDEBAR.filter(item => item.section === 'secondary' && group.hrefs.includes(item.href) && isToolVisible(item.href))
                    if (items.length === 0) return null
                    const open = collapsed || isGroupOpen(`studio:${group.label}`, group.hrefs)
                    return (
                      <div key={group.label}>
                        {!collapsed && (
                          <button onClick={() => toggleGroup(`studio:${group.label}`)} className={styles.groupToggle} aria-expanded={open}>
                            <span className={styles.caret}>{open ? '▼' : '▶'}</span>
                            <span>{group.label}</span>
                          </button>
                        )}
                        {open && (
                          <div className={styles.groupItems}>
                            {items.map(item => (
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
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
          <div className={styles.divider} />
          <Link href="/" className={styles.switchMode} title={collapsed ? 'Browse' : undefined}>
            <span>🌐</span>
            {!collapsed && <span>Browse</span>}
          </Link>
        </>
      ) : (
        <>
          {q ? (
            <div className={styles.searchResults}>
              {exploreMatches.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  aria-label={item.label}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              {exploreMatches.length === 0 && (
                <div className={styles.noResults}>No pages match “{query.trim()}”</div>
              )}
            </div>
          ) : (
            <>
              {!collapsed && <div className={styles.sectionHeader}>Explore</div>}
              {EXPLORE_GROUPS.map(group => {
                const items = NAV.explore.filter(item => group.hrefs.includes(item.href) && isToolVisible(item.href))
                if (items.length === 0) return null
                const open = collapsed || isGroupOpen(`explore:${group.label}`, group.hrefs)
                return (
                  <div key={group.label}>
                    {!collapsed && (
                      <button onClick={() => toggleGroup(`explore:${group.label}`)} className={styles.groupToggle} aria-expanded={open}>
                        <span className={styles.caret}>{open ? '▼' : '▶'}</span>
                        <span>{group.label}</span>
                      </button>
                    )}
                    {open && (
                      <div className={styles.groupItems}>
                        {items.map(item => (
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
                      </div>
                    )}
                  </div>
                )
              })}
              {NAV.explore.filter(item => !EXPLORE_GROUPS.some(g => g.hrefs.includes(item.href)) && isToolVisible(item.href)).map(item => (
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
              {NAV.community.filter(item => isToolVisible(item.href)).map(item => (
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
            </>
          )}
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
