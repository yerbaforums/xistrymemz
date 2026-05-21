'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './Header.module.css'
import CartButton from './CartButton'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { getUserProfileUrl } from '@/lib/utils'
import LocationStatus from './LocationStatus'
import { useTheme } from '@/context/ThemeContext'
import type { ThemeAccent } from '@/context/ThemeContext'

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const headerRef = useRef<HTMLElement>(null)
  const [searchResults, setSearchResults] = useState<{
    plans: { id: string; title: string; type: string; url: string }[]
    products: { id: string; title: string; type: string; url: string }[]
    users: { id: string; name: string | null; type: string; url: string }[]
    groups: { id: string; name: string; type: string; url: string }[]
    events: { id: string; title: string; type: string; url: string }[]
    requests: { id: string; title: string; type: string; url: string }[]
    schoolContent: { id: string; title: string; type: string; url: string }[]
  } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const { settings } = useSiteSettings()
  const { mode, accent, setMode, setAccent, toggleMode } = useTheme()
  const isAuthenticated = status === 'authenticated'
  const isAuthPage = pathname?.startsWith('/auth')

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/auth/role', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data?.role === 'ADMIN') setIsAdmin(true)
        })
        .catch(() => {})
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (session?.user) fetchNotificationCount()
  }, [session])

  useEffect(() => {
    setMenuOpen(false)
    setOpenDropdown(null)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isAuthenticated) {
          setSearchOpen(prev => !prev)
        }
        return
      }
      if (e.key === 'Escape') {
        if (menuOpen) {
          setMenuOpen(false)
          return
        }
        if (openDropdown) {
          setOpenDropdown(null)
          return
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen, openDropdown, isAuthenticated])

  const fetchNotificationCount = async () => {
    try {
      const [connRes, msgRes, notifRes] = await Promise.all([
        fetch('/api/community/members'),
        fetch('/api/messages/conversations'),
        fetch('/api/notifications/unread')
      ])
      if (connRes.ok) {
        const connData = await connRes.json()
        setNotificationCount(connData.pendingRequests?.length || 0)
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json()
        const unreadCount = msgData.conversations?.reduce((sum: number, c: { unreadCount: number }) => sum + c.unreadCount, 0) || 0
        setNotificationCount(prev => prev + unreadCount)
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json()
        setNotificationCount(prev => prev + (notifData.unreadCount || 0))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const toggleDropdown = useCallback((name: string) => {
    setOpenDropdown(prev => prev === name ? null : name)
  }, [])

  const closeDropdown = useCallback(() => {
    setOpenDropdown(null)
  }, [])

  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent, name: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleDropdown(name)
    }
  }, [toggleDropdown])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      setSearchResults(data.results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }, [])

  if (isAuthPage) return null

  const isActive = (path: string) => pathname?.startsWith(path) ? styles.active : ''

  return (
    <header className={styles.header} ref={headerRef}>
      <div className={styles.container}>
        <Link href={isAuthenticated ? '/dashboard/overview' : '/'} className={styles.logo}>
          <Image src="/logo.png" alt="XistrYmemZ" width={36} height={36} />
          <span>XistrYmemZ</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          {isAuthenticated && (
            <Link href="/dashboard/overview" className={`${styles.navToggle} ${styles.dashboardLink} ${isActive('/dashboard')}`} onClick={() => setMenuOpen(false)} aria-current={pathname?.startsWith('/dashboard') ? 'page' : undefined}>
              📊 Dashboard
            </Link>
          )}

          <div className={`${styles.navItem} ${openDropdown === 'explore' ? styles.dropdownVisible : ''}`}>
            <button
              className={`${styles.navToggle}`}
              onClick={() => toggleDropdown('explore')}
              onKeyDown={e => handleDropdownKeyDown(e, 'explore')}
              aria-expanded={openDropdown === 'explore'}
              aria-controls="nav-dropdown-explore"
            >
              Explore
            </button>
            <div className={styles.navDropdown} id="nav-dropdown-explore" role="menu" style={{ minWidth: 200 }}>
              <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Browse</div>
              <Link href="/plans/public" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🚀 Projects</Link>
              <Link href="/products" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🛒 Marketplace</Link>
              <Link href="/shops" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🏪 Shops</Link>
              <Link href="/schools" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🏫 Schools</Link>
              <Link href="/requests" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">📝 Requests</Link>
              <Link href="/events" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">📅 Events</Link>
              <Link href="/hashtags" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"># Hashtags</Link>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
              <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Community</div>
              <Link href="/community" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">👤 Members</Link>
              <Link href="/community/forum" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">💬 Forum</Link>
              <Link href="/community/groups" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">👥 Groups</Link>
              <Link href="/connections" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🔗 Connections</Link>
            </div>
          </div>

          {isAuthenticated && (
            <div className={`${styles.navItem} ${openDropdown === 'more' ? styles.dropdownVisible : ''}`}>
              <button
                className={`${styles.navToggle} ${isActive('/messages') || isActive('/connections')}`}
                onClick={() => toggleDropdown('more')}
                onKeyDown={e => handleDropdownKeyDown(e, 'more')}
                aria-expanded={openDropdown === 'more'}
                aria-controls="nav-dropdown-more"
              >
                More
              </button>
              <div className={styles.navDropdown} id="nav-dropdown-more" role="menu">
                <Link href="/messages" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">💬 Messages</Link>
                <Link href="/dashboard/feed" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">📡 Feed</Link>
                <Link href="/dashboard/appointments" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🗓️ Planner</Link>
                <Link href="/dashboard/offers" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🤝 Offers</Link>
                <Link href="/dashboard/rentals" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🏠 Rentals</Link>
                <Link href="/dashboard/teaching" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🏫 Teaching</Link>
                <Link href="/orders" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">📦 Orders</Link>
                <Link href="/notifications" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🔔 Notifications</Link>
                <Link href="/saved" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">⭐ Saved</Link>
                <Link href="/connections" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🔗 Connections</Link>
                <Link href="/courier/setup" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">🚚 Courier</Link>
                <Link href="/templates" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">📋 Templates</Link>
                {settings.enableWallet ? (
                  <Link href="/wallet" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem">💰 Wallet</Link>
                ) : (
                  <span className={`${styles.navLink} ${styles.disabled}`} title="Coming Soon" role="menuitem" aria-disabled="true">💰 Wallet</span>
                )}
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <>
              <Link href="/about" className={`${styles.navToggle} ${isActive('/about')}`} onClick={() => setMenuOpen(false)}>
                About
              </Link>
              <Link href="/help" className={`${styles.navToggle} ${isActive('/help')}`} onClick={() => setMenuOpen(false)}>
                Help
              </Link>
            </>
          )}
        </nav>

        {/* Location Status */}
        {isAuthenticated && <LocationStatus />}

        {/* Mobile hamburger */}
        <button
          className={`${styles.menuBtn} ${menuOpen ? styles.menuBtnOpen : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile nav overlay */}
        {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

        {/* Mobile nav drawer */}
        <div className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`} id="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className={styles.mobileNavHeader}>
            <Image src="/logo.png" alt="XistrYmemZ" width={28} height={28} />
            <span>XistrYmemZ</span>
            <button className={styles.mobileClose} onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
          </div>

          <div className={styles.mobileSearchWrap}>
            <form
              onSubmit={e => {
                e.preventDefault()
                const q = (e.currentTarget.elements[0] as HTMLInputElement).value
                if (q.trim().length >= 2) {
                  setMenuOpen(false)
                  window.location.href = `/search?q=${encodeURIComponent(q.trim())}`
                }
              }}
            >
              <input
                type="search"
                placeholder="Search the site..."
                className={styles.mobileSearchInput}
                aria-label="Search the site"
              />
            </form>
          </div>

          <div className={styles.mobileSection}>
            <div className={styles.mobileSectionTitle}>Explore</div>
            <Link href="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏠 Home</Link>
            <Link href="/plans/public" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🚀 Projects</Link>
            <Link href="/products" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🛒 Marketplace</Link>
            <Link href="/shops" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏪 Shops</Link>
            <Link href="/schools" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏫 Schools</Link>
            <Link href="/requests" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📝 Requests</Link>
            <Link href="/events" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📅 Events</Link>
            <Link href="/community" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>👤 Members</Link>
            <Link href="/community/forum" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>💬 Forum</Link>
            <Link href="/community/groups" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>👥 Groups</Link>
            <Link href="/connections" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🔗 Connections</Link>
            <Link href="/hashtags" className={styles.mobileLink} onClick={() => setMenuOpen(false)}># Hashtags</Link>
          </div>

          <div className={styles.mobileSection}>
            <div className={styles.mobileSectionTitle}>Theme</div>
            <div className={styles.mobileThemeRow}>
              <button className={styles.mobileThemeToggle} onClick={toggleMode}>
                {mode === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
            <div className={styles.mobileAccentRow}>
              {(['cyan', 'purple', 'green', 'orange', 'pink', 'blue'] as ThemeAccent[]).map(c => (
                <button
                  key={c}
                  className={`${styles.mobileAccentDot} ${accent === c ? styles.mobileAccentDotActive : ''}`}
                  data-accent={c}
                  onClick={() => { setAccent(c); setMenuOpen(false) }}
                  aria-label={`${c} accent`}
                />
              ))}
            </div>
          </div>

          {isAuthenticated ? (
            <>
              <div className={styles.mobileSection}>
                <div className={styles.mobileSectionTitle}>Dashboard</div>
                <Link href="/dashboard/overview" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📊 Overview</Link>
                <Link href="/dashboard/feed" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📡 Feed</Link>
                <Link href="/plans" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🚀 My Projects</Link>
                <Link href="/requests" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📝 My Requests</Link>
                <Link href="/dashboard/offers" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🤝 Offers</Link>
                <Link href="/dashboard/rentals" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏠 Rentals</Link>
                <Link href="/dashboard/teaching" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏫 Teaching</Link>
                <Link href="/dashboard/events" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📅 Events</Link>
                <Link href="/dashboard/appointments" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🗓️ Planner</Link>
                <Link href="/notifications" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🔔 Notifications</Link>
                <Link href="/saved" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>⭐ Saved</Link>
                <Link href="/connections" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🔗 Connections</Link>
                <Link href="/messages" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>💬 Messages</Link>
                <Link href="/courier/setup" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🚚 Courier</Link>
                <Link href="/templates" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📋 Templates</Link>
                {settings.enableWallet ? (
                  <Link href="/wallet" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>💳 Wallet</Link>
                ) : (
                  <span className={`${styles.mobileLink} ${styles.disabled}`}>💳 Wallet (Coming Soon)</span>
                )}
                <Link href={session?.user ? getUserProfileUrl({ id: session.user.id, username: (session.user as { username?: string }).username }) : '/auth/login'} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>👤 Profile</Link>
                <Link href="/profile/settings" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>⚙️ Settings</Link>
                <Link href="/onboarding" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🚀 Getting Started</Link>
              </div>

              {isAdmin && (
                <div className={styles.mobileSection}>
                  <div className={`${styles.mobileSectionTitle} ${styles.adminSection}`}>Admin</div>
                  <Link href="/admin/subscribers" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>📧 Subscribers</Link>
                  <Link href="/admin/orders" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>📦 Orders</Link>
                  <Link href="/admin/wallets" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>💳 Wallets</Link>
                  <Link href="/admin/messages" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>💬 Messages</Link>
                  <Link href="/admin/invite-codes" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>🎟️ Invite Codes</Link>
                  <Link href="/admin/users" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>👤 Users</Link>
                  <Link href="/admin/settings" className={`${styles.mobileLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>⚙️ Settings</Link>
                </div>
              )}

              <div className={styles.mobileSection}>
                <button className={styles.mobileSignOut} onClick={() => { setMenuOpen(false); signOut() }}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className={styles.mobileSection}>
              <div className={styles.mobileAuthButtons}>
                <Link href="/auth/login" className={styles.mobileLoginBtn} onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/auth/register" className={styles.mobileSignupBtn} onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </div>
            </div>
          )}
        </div>

        {/* Right section: search + auth */}
        <div className={styles.rightSection}>
          {isAuthenticated && (
            <>
              <button className={styles.themeToggle} onClick={toggleMode} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                {mode === 'dark' ? <span aria-hidden="true">☀️</span> : <span aria-hidden="true">🌙</span>}
              </button>
              <div className={styles.searchContainer}>
                {searchOpen ? (
                  <>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className={styles.searchInputExpanded}
                      autoFocus
                      aria-label="Search the site"
                    />
                    {searchOpen && searchQuery.length >= 2 && (
                      <div className={styles.searchDropdown}>
                        {searching ? (
                          <div className={styles.searchLoading}>Searching...</div>
                        ) : searchResults ? (
                          <>
                            {searchResults.plans?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}>🚀 Projects</div>
                                {searchResults.plans.map(p => (
                                  <Link key={p.id} href={p.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {p.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.products?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}>🛒 Products</div>
                                {searchResults.products.map(p => (
                                  <Link key={p.id} href={p.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {p.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.users?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}>👤 Users</div>
                                {searchResults.users.map(u => (
                                  <Link key={u.id} href={u.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {u.name || 'Unknown'}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.events?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}>📅 Events</div>
                                {searchResults.events.map(e => (
                                  <Link key={e.id} href={e.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {e.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.requests?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}><span aria-hidden="true">📝</span> Requests</div>
                                {searchResults.requests.map(r => (
                                  <Link key={r.id} href={r.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {r.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {(!searchResults.plans?.length && !searchResults.products?.length && !searchResults.users?.length && !searchResults.events?.length && !searchResults.requests?.length && !searchResults.groups?.length && !searchResults.schoolContent?.length) && (
                              <div className={styles.searchEmpty}>No results found for &quot;{searchQuery}&quot;</div>
                            )}
                            <Link href={`/search?q=${encodeURIComponent(searchQuery)}`} className={styles.seeAllResults} onClick={() => setSearchOpen(false)}>
                              See all results →
                            </Link>
                          </>
                        ) : (
                          <div className={styles.searchEmpty}>Type to search...</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <button className={styles.searchToggleBtn} onClick={() => setSearchOpen(true)} aria-label="Search" title="Search">
                    <span aria-hidden="true">🔍</span>
                  </button>
                )}
              </div>

              <CartButton />

              {notificationCount > 0 && (
                <Link href="/notifications" className={styles.notificationBtn} aria-label={`Notifications (${notificationCount})`}>
                  <span className={styles.bellIcon}>🔔</span>
                  <span className={styles.notificationBadge}>{notificationCount}</span>
                </Link>
              )}

              {notificationCount === 0 && isAuthenticated && (
                <Link href="/notifications" className={styles.notificationBtn} aria-label="Notifications">
                  <span className={styles.bellIcon}>🔔</span>
                </Link>
              )}

              <div className={`${styles.userMenu} ${openDropdown === 'user' ? styles.userDropdownVisible : ''}`}>
                <button
                  className={styles.userBtn}
                  aria-label="User menu"
                  onClick={() => toggleDropdown('user')}
                  onKeyDown={e => handleDropdownKeyDown(e, 'user')}
                  aria-expanded={openDropdown === 'user'}
                  aria-controls="user-menu-dropdown"
                >
                  {session.user.image ? (
                    <Image src={session.user.image} alt={session.user.name || ''} className={styles.userAvatar} width={36} height={36} />
                  ) : (
                    <span className={styles.userInitial}>
                      {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </button>
                <div className={styles.userDropdown} id="user-menu-dropdown" role="menu">
                  <div className={styles.userInfo}>
                    <strong>{session.user.name || 'User'}</strong>
                    <span className={styles.userEmail}>{session.user.email}</span>
                  </div>
                  <div className={styles.themeAccentPicker}>
                    {(['cyan', 'purple', 'green', 'orange', 'pink', 'blue'] as ThemeAccent[]).map(c => (
                      <button
                        key={c}
                        className={`${styles.accentDot} ${accent === c ? styles.accentDotActive : ''}`}
                        data-accent={c}
                        onClick={() => setAccent(c)}
                        aria-label={`${c} accent theme`}
                        title={`${c} accent theme`}
                      />
                    ))}
                  </div>
                  <div className={styles.userLinks}>
                    <Link href={session?.user ? getUserProfileUrl({ id: session.user.id, username: (session.user as { username?: string }).username }) : '/auth/login'} className={styles.userLink} role="menuitem" onClick={closeDropdown}>My Profile</Link>
                    <Link href="/profile/settings" className={styles.userLink} role="menuitem" onClick={closeDropdown}>Settings</Link>
                    <Link href="/onboarding" className={styles.userLink} role="menuitem" onClick={closeDropdown}>🚀 Getting Started</Link>
                    <Link href="/dashboard/overview" className={styles.userLink} role="menuitem" onClick={closeDropdown}>Dashboard</Link>
                    {settings.enableWallet ? (
                      <Link href="/wallet" className={styles.userLink} role="menuitem" onClick={closeDropdown}>Wallet</Link>
                    ) : (
                      <span className={`${styles.userLink} ${styles.disabled}`} role="menuitem" aria-disabled="true">Wallet (Coming Soon)</span>
                    )}
                    <Link href="/orders" className={styles.userLink} role="menuitem" onClick={closeDropdown}>Orders</Link>
                    <Link href="/messages" className={styles.userLink} role="menuitem" onClick={closeDropdown}>Messages</Link>
                    <Link href="/saved" className={styles.userLink} role="menuitem" onClick={closeDropdown}>Saved</Link>
                    {isAdmin && (
                      <>
                        <div className={styles.adminDivider}>Admin</div>
                        <Link href="/admin/subscribers" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>📧 Subscribers</Link>
                        <Link href="/admin/orders" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>📦 Orders</Link>
                        <Link href="/admin/wallets" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>💳 Wallets</Link>
                        <Link href="/admin/messages" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>💬 Messages</Link>
                        <Link href="/admin/invite-codes" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>🎟️ Invite Codes</Link>
                        <Link href="/admin/users" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>👤 Users</Link>
                        <Link href="/admin/settings" className={`${styles.userLink} ${styles.adminLink}`} role="menuitem" onClick={closeDropdown}>⚙️ Settings</Link>
                      </>
                    )}
                  </div>
                  <button onClick={() => signOut()} className={styles.signOutBtn} role="menuitem">Sign Out</button>
                </div>
              </div>
            </>
          )}

          {!isAuthenticated && status !== 'loading' && (
            <>
              <button className={styles.themeToggle} onClick={toggleMode} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                {mode === 'dark' ? <span aria-hidden="true">☀️</span> : <span aria-hidden="true">🌙</span>}
              </button>
              <div className={styles.authButtons}>
                <Link href="/auth/login" className={styles.loginBtn}>Login</Link>
                <Link href="/auth/register" className={styles.signupBtn}>Sign Up</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}