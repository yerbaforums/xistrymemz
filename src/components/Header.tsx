'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import styles from './Header.module.css'
import CartButton from './CartButton'
import { useQuickCreate } from '@/components/QuickCreateModal'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import LocationStatus from './LocationStatus'
import { useTheme } from '@/context/ThemeContext'
import { useNotificationSSE } from '@/hooks/useNotificationSSE'
import { EmptyState } from '@/components/EmptyState'
import MobileNav from './MobileNav'
import UserDropdown from './UserDropdown'
import LanguageRequestModal from './LanguageRequestModal'

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
  { code: 'it', label: 'IT' },
  { code: 'ru', label: 'RU' },
  { code: 'de', label: 'DE' },
  { code: 'hi', label: 'HI' },
  { code: 'ja', label: 'JA' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'ko', label: 'KO' },
  { code: 'nl', label: 'NL' },
  { code: 'pl', label: 'PL' },
  { code: 'sv', label: 'SV' },
  { code: 'tr', label: 'TR' },
]

export default function Header() {
  const t = useTranslations('header')
  const currentLocale = useLocale()
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isTraveling, setIsTraveling] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [langReqOpen, setLangReqOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const headerRef = useRef<HTMLElement>(null)
  const quickCreate = useQuickCreate()
  const [searchResults, setSearchResults] = useState<{
    projects: { id: string; title: string; type: string; url: string }[]
    products: { id: string; title: string; type: string; url: string }[]
    services: { id: string; title: string; type: string; url: string }[]
    users: { id: string; name: string | null; type: string; url: string }[]
    groups: { id: string; name: string; type: string; url: string }[]
    events: { id: string; title: string; type: string; url: string }[]
    requests: { id: string; title: string; type: string; url: string }[]
    hashtags: { tag: string; postCount: number; type: string; url: string }[]
    schoolContent: { id: string; title: string; type: string; url: string }[]
  } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const { settings } = useSiteSettings()
  const { mode, toggleMode } = useTheme()
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
    if (!session?.user) return
    const load = async () => {
      try {
        const [connRes, msgRes, notifRes, inboxRes] = await Promise.all([
          fetch('/api/community/members'),
          fetch('/api/messages/conversations'),
          fetch('/api/notifications/unread'),
          fetch('/api/inbox')
        ])
        if (connRes.ok) {
          const connData = await connRes.json()
          setNotificationCount(connData?.data?.pendingRequests?.items?.length || connData?.pendingRequests?.items?.length || 0)
        }
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          const conversations = msgData?.data?.conversations || msgData?.conversations || []
          const unreadCount = conversations.reduce((sum: number, c: { unreadCount: number }) => sum + c.unreadCount, 0) || 0
          setNotificationCount(prev => prev + unreadCount)
        }
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          setNotificationCount(prev => prev + (notifData?.data?.unreadCount ?? notifData?.unreadCount ?? 0))
        }
        if (inboxRes.ok) {
          const inboxData = await inboxRes.json()
          setMessagesUnread(inboxData?.data?.unreadCount ?? inboxData?.unreadCount ?? 0)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }
    load()
  }, [session])

  const fetchNotificationCount = useCallback(async () => {
    try {
      const [notifRes, inboxRes] = await Promise.all([
        fetch('/api/notifications/unread'),
        fetch('/api/inbox')
      ])
      let total = 0
      if (notifRes.ok) {
        const data = await notifRes.json()
        total += data?.data?.unreadCount ?? data?.unreadCount ?? 0
      }
      if (inboxRes.ok) {
        const data = await inboxRes.json()
        setMessagesUnread(data?.data?.unreadCount ?? data?.unreadCount ?? 0)
      }
      setNotificationCount(total)
    } catch (e) { console.error('Error fetching notification count:', e) }
  }, [])

  useNotificationSSE(useCallback((event) => {
    if (event.type === 'unread-count' && event.unreadCount !== undefined) {
      setNotificationCount(prev => prev + event.unreadCount!)
    }
    if (event.type === 'notification') {
      fetchNotificationCount()
    }
  }, [fetchNotificationCount]))

  // Close menus on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false)
    setOpenDropdown(null)
  }, [pathname])

  useEffect(() => {
    const handler = (e: CustomEvent<{ traveling: boolean }>) => setIsTraveling(e.detail.traveling)
    window.addEventListener('traveling-changed', handler as EventListener)
    fetch('/api/users/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.traveling !== undefined) setIsTraveling(d.user.traveling) })
      .catch(() => {})
    return () => window.removeEventListener('traveling-changed', handler as EventListener)
  }, [])

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
            <div className={`${styles.navItem} ${openDropdown === 'dashboard' ? styles.dropdownVisible : ''}`}>
              <Link
                href="/dashboard/overview"
                className={`${styles.navToggle} ${styles.dashboardLink}`}
                onClick={() => { setOpenDropdown(null); setMenuOpen(false) }}
              >
                <span aria-hidden="true">📊</span> Dashboard
              </Link>
              <div className={styles.navDropdown} id="nav-dropdown-dashboard" role="menu" style={{ minWidth: 200 }}>
                <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main</div>
                <Link href="/dashboard/overview" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📊</span> Overview</Link>
                <Link href="/dashboard/planning" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🗺️</span> Planning</Link>
                <Link href="/dashboard/marketplace" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🛒</span> Marketplace</Link>
                <Link href="/dashboard/services" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🔧</span> Services</Link>
                <Link href="/dashboard/rentals" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🏠</span> Rentals</Link>
                <Link href="/dashboard/shop" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🏪</span> Shop</Link>
                <Link href="/dashboard/events" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📅</span> Events</Link>
                <Link href="/dashboard/appointments" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🗓️</span> Planner</Link>
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal</div>
                <Link href="/dashboard/passport" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🌍</span> Passport</Link>
                <Link href="/dashboard/feed" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📡</span> Feed</Link>
                <Link href="/dashboard/messages" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">💬</span> Messages{messagesUnread > 0 && <span className={styles.navBadge}>{messagesUnread > 99 ? '99+' : messagesUnread}</span>}</Link>
                <Link href="/dashboard/saved" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">⭐</span> Saved</Link>
              </div>
            </div>
          )}

          {isAuthenticated && (
            <div className={`${styles.navItem} ${openDropdown === 'create' ? styles.dropdownVisible : ''}`}>
              <button
                className={`${styles.navToggle} ${styles.createBtn}`}
                onClick={() => toggleDropdown('create')}
                onKeyDown={e => handleDropdownKeyDown(e, 'create')}
                aria-expanded={openDropdown === 'create'}
                aria-controls="nav-dropdown-create"
              >
                <span aria-hidden="true">➕</span> Create
              </button>
              <div className={styles.navDropdown} id="nav-dropdown-create" role="menu" style={{ minWidth: 200 }}>
                <button onClick={() => { closeDropdown(); quickCreate.open('post') }} className={styles.navLink} role="menuitem" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: '8px 12px', color: 'var(--text-secondary)' }}><span aria-hidden="true">✏️</span> New Post</button>
                <Link href="/dashboard/projects" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🚀</span> New Project</Link>
                <Link href="/products/new" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🛒</span> New Product</Link>
                <Link href="/events/new" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📅</span> New Event</Link>
                <Link href="/groups/new" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">👥</span> New Group</Link>
                <Link href="/requests" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📝</span> New Request</Link>
                <Link href="/dashboard/services" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🔧</span> New Service</Link>
              </div>
            </div>
          )}

          <div className={`${styles.navItem} ${openDropdown === 'explore' ? styles.dropdownVisible : ''}`}>
            <button
              className={`${styles.navToggle}`}
              onClick={() => toggleDropdown('explore')}
              onKeyDown={e => handleDropdownKeyDown(e, 'explore')}
              aria-expanded={openDropdown === 'explore'}
              aria-controls="nav-dropdown-explore"
            >
              {t('explore')}
            </button>
            <div className={styles.navDropdown} id="nav-dropdown-explore" role="menu" style={{ minWidth: 200 }}>
              <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('browse')}</div>
              <Link href="/discover" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🌐</span> Discover</Link>
              <Link href="/projects" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🚀</span> Projects</Link>
              <Link href="/boards" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📌</span> Boards</Link>
              <Link href="/products" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🛒</span> Products</Link>
              <Link href="/services" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🔧</span> Services</Link>
              <Link href="/shops" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🏪</span> Shops</Link>
              <Link href="/schools" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🏫</span> Schools</Link>
              <Link href="/requests" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📝</span> Requests</Link>
              <Link href="/events" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📅</span> Events</Link>
              <Link href="/rentals" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🏠</span> Rentals</Link>
              <Link href="/directory" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📋</span> Directory</Link>
              <Link href="/hashtags" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"># Hashtags</Link>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
              <div style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('community')}</div>
              <Link href="/community" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">👤</span> Members</Link>
              <Link href="/community/forum" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">💬</span> Forum</Link>
              <Link href="/community/groups" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">👥</span> Groups</Link>
              <Link href="/connections" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🔗</span> Connections</Link>
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
                {t('more')}
              </button>
              <div className={styles.navDropdown} id="nav-dropdown-more" role="menu">
                <Link href="/dashboard/video" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📹</span> Video Chat</Link>
                <Link href="/dashboard/offers" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🤝</span> Offers</Link>
                <Link href="/dashboard/teaching" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🏫</span> Teaching</Link>
                <Link href="/orders" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📦</span> Orders</Link>
                <Link href="/notifications" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🔔</span> Notifications</Link>
                <Link href="/connections" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🔗</span> Connections</Link>
                <Link href="/courier/setup" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">🚚</span> Courier</Link>
                <Link href="/templates" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">📋</span> Templates</Link>
                {settings.enableWallet ? (
                  <Link href="/wallet" className={styles.navLink} onClick={() => { setMenuOpen(false); closeDropdown() }} role="menuitem"><span aria-hidden="true">💰</span> Wallet</Link>
                ) : (
                  <span className={`${styles.navLink} ${styles.disabled}`} title="Coming Soon" role="menuitem" aria-disabled="true"><span aria-hidden="true">💰</span> Wallet</span>
                )}
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <>
              <Link href="/about" className={`${styles.navToggle} ${isActive('/about')}`} onClick={() => setMenuOpen(false)}>
                {t('about')}
              </Link>
              <Link href="/help" className={`${styles.navToggle} ${isActive('/help')}`} onClick={() => setMenuOpen(false)}>
                {t('help')}
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

        <MobileNav
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
          session={session}
          messagesUnread={messagesUnread}
        />

        {/* Right section: search + auth */}
        <div className={styles.rightSection}>
          {isAuthenticated && (
            <>
              <div className={`${styles.localeSwitcher} ${openDropdown === 'locale' ? styles.localeDropdownVisible : ''}`}>
                <button className={styles.localeBtn} onClick={() => toggleDropdown('locale')} aria-label="Switch language" title="Switch language">
                  {currentLocale.toUpperCase()}
                </button>
                <div className={styles.localeDropdown}>
                  {LOCALES.filter(l => l.code !== currentLocale).map(l => (
                    <Link
                      key={l.code}
                      href={l.code === 'en' ? '/' : `/${l.code}`}
                      className={styles.localeOption}
                      onClick={() => closeDropdown()}
                    >
                      {l.label}
                    </Link>
                  ))}
                  <div className={styles.localeDivider} />
                  <button className={styles.localeOption} onClick={() => { closeDropdown(); setLangReqOpen(true) }}>
                    🌐 Request Language
                  </button>
                </div>
              </div>
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
                                <div className={styles.searchSectionTitle}><span aria-hidden="true">🚀</span> Projects</div>
                                {searchResults.plans.map(p => (
                                  <Link key={p.id} href={p.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {p.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.products?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}><span aria-hidden="true">🛒</span> Products</div>
                                {searchResults.products.map(p => (
                                  <Link key={p.id} href={p.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {p.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.services?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}><span aria-hidden="true">🔧</span> Services</div>
                                {searchResults.services.map(s => (
                                  <Link key={s.id} href={s.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {s.title}
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
                                <div className={styles.searchSectionTitle}><span aria-hidden="true">📅</span> Events</div>
                                {searchResults.events.map(e => (
                                  <Link key={e.id} href={e.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {e.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.groups?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}><span aria-hidden="true">👥</span> Groups</div>
                                {searchResults.groups.map(g => (
                                  <Link key={g.id} href={g.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    {g.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                            {searchResults.hashtags?.length > 0 && (
                              <div className={styles.searchSection}>
                                <div className={styles.searchSectionTitle}># Hashtags</div>
                                {searchResults.hashtags.map(h => (
                                  <Link key={h.tag} href={h.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                                    #{h.tag} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({h.postCount} posts)</span>
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
                            {(!searchResults.plans?.length && !searchResults.products?.length && !searchResults.services?.length && !searchResults.users?.length && !searchResults.events?.length && !searchResults.requests?.length && !searchResults.groups?.length && !searchResults.hashtags?.length && !searchResults.schoolContent?.length) && (
                              <EmptyState icon="🔍" title="No results found" description={`No results for "${searchQuery}"`} />
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

              {isAuthenticated && (
                <Link
                  href="/notifications"
                  className={styles.notificationBtn}
                  aria-label={notificationCount > 0 ? `Notifications (${notificationCount})` : 'Notifications'}
                >
                  <span className={styles.bellIcon}>🔔</span>
                  {notificationCount > 0 && <span className={styles.notificationBadge}>{notificationCount}</span>}
                </Link>
              )}

              <div className={`${styles.userMenu} ${openDropdown === 'user' ? styles.userDropdownVisible : ''}`}>
                <div style={{ position: 'relative' }}>
                  <button
                    className={styles.userBtn}
                    aria-label="User menu"
                    onClick={() => toggleDropdown('user')}
                    onKeyDown={e => handleDropdownKeyDown(e, 'user')}
                    aria-expanded={openDropdown === 'user'}
                    aria-controls="user-menu-dropdown"
                  >
                    {session.user.image ? (
                      <Image src={session.user.image} alt={session.user.name || ''} fill className={styles.userAvatar} />
                    ) : (
                      <span className={styles.userInitial}>
                        {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </button>
                  {isTraveling && (
                    <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '11px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>✈️</span>
                  )}
                </div>
                <UserDropdown
                  session={session}
                  open={openDropdown === 'user'}
                  onClose={closeDropdown}
                  traveling={isTraveling}
                />
              </div>
            </>
          )}

          {!isAuthenticated && status !== 'loading' && (
            <>
              <div className={`${styles.localeSwitcher} ${openDropdown === 'locale' ? styles.localeDropdownVisible : ''}`}>
                <button className={styles.localeBtn} onClick={() => toggleDropdown('locale')} aria-label="Switch language" title="Switch language">
                  {currentLocale.toUpperCase()}
                </button>
                <div className={styles.localeDropdown}>
                  {LOCALES.filter(l => l.code !== currentLocale).map(l => (
                    <Link
                      key={l.code}
                      href={l.code === 'en' ? '/' : `/${l.code}`}
                      className={styles.localeOption}
                      onClick={() => closeDropdown()}
                    >
                      {l.label}
                    </Link>
                  ))}
                  <div className={styles.localeDivider} />
                  <button className={styles.localeOption} onClick={() => { closeDropdown(); setLangReqOpen(true) }}>
                    🌐 Request Language
                  </button>
                </div>
              </div>
              <button className={styles.themeToggle} onClick={toggleMode} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                {mode === 'dark' ? <span aria-hidden="true">☀️</span> : <span aria-hidden="true">🌙</span>}
              </button>
              <div className={styles.authButtons}>
                <Link href="/auth/login" className={styles.loginBtn}>{t('login')}</Link>
                <Link href="/auth/register" className={styles.signupBtn}>{t('signUp')}</Link>
              </div>
            </>
          )}
        </div>
      </div>
      <LanguageRequestModal open={langReqOpen} onClose={() => setLangReqOpen(false)} />
    </header>
  )
}