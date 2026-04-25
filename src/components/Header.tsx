'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import styles from './Header.module.css'
import CartButton from './CartButton'
import { useSiteSettings } from '@/hooks/useSiteSettings'

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
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
  }, [pathname])

  const fetchNotificationCount = async () => {
    try {
      const [connRes, msgRes] = await Promise.all([
        fetch('/api/community/members'),
        fetch('/api/messages/conversations')
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
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

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
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href={isAuthenticated ? '/dashboard/overview' : '/'} className={styles.logo}>
          <Image src="/logo.png" alt="XistrYmemZ" width={36} height={36} />
          <span>XistrYmemZ</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          {isAuthenticated && (
            <Link href="/dashboard/overview" className={`${styles.navToggle} ${styles.dashboardLink} ${isActive('/dashboard')}`} onClick={() => setMenuOpen(false)}>
              📊 Dashboard
            </Link>
          )}

          <div className={styles.navItem}>
            <button className={`${styles.navToggle} ${isActive('/plans') || isActive('/requests/public')}`}>
              Discover
            </button>
            <div className={styles.navDropdown}>
              <Link href="/plans/public" className={styles.navLink} onClick={() => setMenuOpen(false)}>🚀 Browse Projects</Link>
              <Link href="/requests/public" className={styles.navLink} onClick={() => setMenuOpen(false)}>📝 Public Requests</Link>
              <Link href="/events" className={styles.navLink} onClick={() => setMenuOpen(false)}>📅 Events</Link>
              <Link href="/products" className={styles.navLink} onClick={() => setMenuOpen(false)}>🛒 Marketplace</Link>
              <Link href="/shops" className={styles.navLink} onClick={() => setMenuOpen(false)}>🏪 Shops</Link>
              <Link href="/schools" className={styles.navLink} onClick={() => setMenuOpen(false)}>🏫 Schools</Link>
            </div>
          </div>

          <div className={styles.navItem}>
            <button className={`${styles.navToggle} ${isActive('/community')}`}>
              Community
            </button>
            <div className={styles.navDropdown}>
              <Link href="/community" className={styles.navLink} onClick={() => setMenuOpen(false)}>👤 Members</Link>
              <Link href="/community/forum" className={styles.navLink} onClick={() => setMenuOpen(false)}>💬 Forum</Link>
              <Link href="/community/groups" className={styles.navLink} onClick={() => setMenuOpen(false)}>👥 Groups</Link>
            </div>
          </div>

          {isAuthenticated && (
            <div className={styles.navItem}>
              <button className={`${styles.navToggle} ${isActive('/messages') || isActive('/connections')}`}>
                More
              </button>
              <div className={styles.navDropdown}>
                <Link href="/messages" className={styles.navLink} onClick={() => setMenuOpen(false)}>💬 Messages</Link>
                <Link href="/orders" className={styles.navLink} onClick={() => setMenuOpen(false)}>📦 Orders</Link>
                {settings.enableWallet ? (
                  <Link href="/wallet" className={styles.navLink} onClick={() => setMenuOpen(false)}>💳 Wallet</Link>
                ) : (
                  <span className={`${styles.navLink} ${styles.disabled}`} title="Coming Soon">💳 Wallet</span>
                )}
                <Link href="/courier/setup" className={styles.navLink} onClick={() => setMenuOpen(false)}>🚚 Courier</Link>
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

        {/* Mobile hamburger */}
        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile nav overlay */}
        {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

        {/* Mobile nav drawer */}
        <div className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}>
          <div className={styles.mobileNavHeader}>
            <Image src="/logo.png" alt="XistrYmemZ" width={28} height={28} />
            <span>XistrYmemZ</span>
            <button className={styles.mobileClose} onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
          </div>

          <div className={styles.mobileSection}>
            <div className={styles.mobileSectionTitle}>Discover</div>
            <Link href="/plans/public" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🚀 Browse Projects</Link>
            <Link href="/requests/public" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📝 Public Requests</Link>
            <Link href="/events" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📅 Events</Link>
            <Link href="/products" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🛒 Marketplace</Link>
            <Link href="/shops" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏪 Shops</Link>
            <Link href="/schools" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🏫 Schools</Link>
          </div>

          <div className={styles.mobileSection}>
            <div className={styles.mobileSectionTitle}>Community</div>
            <Link href="/community" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>👤 Members</Link>
            <Link href="/community/forum" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>💬 Forum</Link>
            <Link href="/community/groups" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>👥 Groups</Link>
          </div>

          {isAuthenticated ? (
            <>
              <div className={styles.mobileSection}>
                <div className={styles.mobileSectionTitle}>Dashboard</div>
                <Link href="/dashboard/overview" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📊 Overview</Link>
                <Link href="/plans" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>🚀 My Projects</Link>
                <Link href="/requests" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📝 My Requests</Link>
                <Link href="/dashboard/events" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📅 My Events</Link>
                {settings.enableWallet ? (
                  <Link href="/wallet" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>💳 Wallet</Link>
                ) : (
                  <span className={`${styles.mobileLink} ${styles.disabled}`}>💳 Wallet (Coming Soon)</span>
                )}
                <Link href="/messages" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>💬 Messages</Link>
                <Link href="/profile" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>👤 Profile</Link>
                <Link href="/profile/settings" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>⚙️ Settings</Link>
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
                                <div className={styles.searchSectionTitle}>📝 Requests</div>
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
                          </>
                        ) : (
                          <div className={styles.searchEmpty}>Type to search...</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <button className={styles.searchToggleBtn} onClick={() => setSearchOpen(true)} aria-label="Search" title="Search">
                    🔍
                  </button>
                )}
              </div>

              <CartButton />

              {notificationCount > 0 && (
                <Link href="/community" className={styles.notificationBtn} aria-label={`Notifications (${notificationCount})`}>
                  <span className={styles.bellIcon}>🔔</span>
                  <span className={styles.notificationBadge}>{notificationCount}</span>
                </Link>
              )}

              <div className={styles.userMenu}>
                <button className={styles.userBtn} aria-label="User menu">
                  {session.user.image ? (
                    <Image src={session.user.image} alt={session.user.name || ''} className={styles.userAvatar} width={36} height={36} />
                  ) : (
                    <span className={styles.userInitial}>
                      {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </button>
                <div className={styles.userDropdown}>
                  <div className={styles.userInfo}>
                    <strong>{session.user.name || 'User'}</strong>
                    <span className={styles.userEmail}>{session.user.email}</span>
                  </div>
                  <div className={styles.userLinks}>
                    <Link href="/profile" className={styles.userLink}>My Profile</Link>
                    <Link href="/profile/settings" className={styles.userLink}>Settings</Link>
                    <Link href="/dashboard/overview" className={styles.userLink}>Dashboard</Link>
                    {settings.enableWallet ? (
                      <Link href="/wallet" className={styles.userLink}>Wallet</Link>
                    ) : (
                      <span className={`${styles.userLink} ${styles.disabled}`}>Wallet (Coming Soon)</span>
                    )}
                    <Link href="/orders" className={styles.userLink}>Orders</Link>
                    <Link href="/messages" className={styles.userLink}>Messages</Link>
                    {isAdmin && (
                      <>
                        <div className={styles.adminDivider}>Admin</div>
                        <Link href="/admin/subscribers" className={`${styles.userLink} ${styles.adminLink}`}>📧 Subscribers</Link>
                        <Link href="/admin/orders" className={`${styles.userLink} ${styles.adminLink}`}>📦 Orders</Link>
                        <Link href="/admin/wallets" className={`${styles.userLink} ${styles.adminLink}`}>💳 Wallets</Link>
                        <Link href="/admin/messages" className={`${styles.userLink} ${styles.adminLink}`}>💬 Messages</Link>
                        <Link href="/admin/invite-codes" className={`${styles.userLink} ${styles.adminLink}`}>🎟️ Invite Codes</Link>
                        <Link href="/admin/users" className={`${styles.userLink} ${styles.adminLink}`}>👤 Users</Link>
                        <Link href="/admin/settings" className={`${styles.userLink} ${styles.adminLink}`}>⚙️ Settings</Link>
                      </>
                    )}
                  </div>
                  <button onClick={() => signOut()} className={styles.signOutBtn}>Sign Out</button>
                </div>
              </div>
            </>
          )}

          {!isAuthenticated && status !== 'loading' && (
            <div className={styles.authButtons}>
              <Link href="/auth/login" className={styles.loginBtn}>Login</Link>
              <Link href="/auth/register" className={styles.signupBtn}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}