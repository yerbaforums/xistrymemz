'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import styles from './Header.module.css'
import CartButton from './CartButton'

function Dropdown({ label, items, pathname, onClose }: { label: string, items: { href: string, icon: string, label?: string }[], pathname: string | null, onClose: () => void }) {
  return (
    <div className={styles.dropdown}>
      <button 
        className={`${styles.dropdownToggle} ${items.some(i => pathname?.startsWith(i.href.split('/')[1])) ? styles.active : ''}`}
      >
        {label}
      </button>
      <div className={styles.dropdownMenu}>
        {items.map(item => (
          <Link 
            key={item.href}
            href={item.href}
            className={pathname?.startsWith(item.href.split('/')[1] || '') ? styles.active : ''}
            onClick={onClose}
          >
            {item.icon} {item.label || item.href.split('/')[1].charAt(0).toUpperCase() + item.href.split('/')[1].slice(1)}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/auth/role', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data?.role === 'ADMIN') {
            setIsAdmin(true)
          }
        })
        .catch(() => {})
    }
  }, [status])

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
  const [searchInputFocused, setSearchInputFocused] = useState(false)

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

  useEffect(() => {
    if (session?.user) {
      fetchNotificationCount()
    }
  }, [session])

  const fetchNotificationCount = async () => {
    try {
      const [connRes, msgRes] = await Promise.all([
        fetch('/api/community/members'),
        fetch('/api/messages/conversations')
      ])
      
      if (connRes.ok) {
        const connData = await connRes.json()
        const pendingCount = connData.pendingRequests?.length || 0
        setNotificationCount(prev => prev + pendingCount)
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

  if (status === 'loading') {
    return (
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </header>
    )
  }

  const isAuthPage = pathname?.startsWith('/auth')

  if (isAuthPage || !session) {
    return null
  }

const marketplaceItems = [
    { href: '/products', icon: '🛒', label: 'Browse Products' },
    { href: '/products?tab=services', icon: '🛠️', label: 'Services' },
    { href: '/shops', icon: '🏪', label: 'Visit Shops' },
    { href: '/orders', icon: '📦', label: 'My Orders' },
  ]

  const projectItems = [
    { href: '/plans', icon: '🚀', label: 'My Projects' },
    { href: '/plans/public', icon: '🌐', label: 'Explore Projects' },
    { href: '/requests', icon: '📝', label: 'My Requests' },
    { href: '/requests/public', icon: '🌐', label: 'Public Requests' },
  ]

  const communityItems = [
    { href: '/community/forum', icon: '💬', label: 'Forum' },
    { href: '/community/groups', icon: '👥', label: 'Groups' },
    { href: '/community', icon: '👤', label: 'Members' },
    { href: '/messages', icon: '✉️', label: 'Messages' },
  ]

  const learningItems = [
    { href: '/schools', icon: '🏫', label: 'Browse Schools' },
    { href: '/school/setup', icon: '➕', label: 'Create School' },
  ]

  const accountItems = [
    { href: '/dashboard/overview', icon: '📊', label: 'Dashboard' },
    { href: '/wallet', icon: '💳', label: 'Wallet' },
    { href: '/profile', icon: '👤', label: 'My Profile' },
  ]

  const adminItems = [
    { href: '/admin/subscribers', icon: '📧', label: 'Subscribers' },
    { href: '/admin/orders', icon: '📦', label: 'Orders' },
    { href: '/admin/wallets', icon: '💳', label: 'Wallets' },
    { href: '/admin/messages', icon: '💬', label: 'Messages' },
    { href: '/admin/invite-codes', icon: '🎟️', label: 'Invite Codes' },
    { href: '/admin/users', icon: '👤', label: 'Users' },
  ]

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/dashboard/overview" className={styles.logo}>
          <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} />
          <span>XistrYmemZ</span>
        </Link>

        <div className={styles.searchContainer}>
          {searchOpen || searchInputFocused ? (
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                setSearchInputFocused(true)
                setSearchOpen(true)
                if (searchQuery.length >= 2 && !searchResults) {
                  handleSearch(searchQuery)
                }
              }}
              onBlur={() => setTimeout(() => { setSearchOpen(false); setSearchInputFocused(false) }, 300)}
              className={styles.searchInputExpanded}
              autoFocus
            />
          ) : (
            <button 
              className={styles.searchToggleBtn}
              onClick={() => setSearchOpen(true)}
              title="Search"
            >
              🔍
            </button>
          )}
          {searchOpen && searchQuery.length >= 2 && (
            <div className={styles.searchDropdown}>
              {searching ? (
                <div className={styles.searchLoading}>Searching...</div>
              ) : searchResults ? (
                <>
                  {((searchResults.plans?.length ?? 0) > 0 || (searchResults.products?.length ?? 0) > 0 || 
                    (searchResults.users?.length ?? 0) > 0 || (searchResults.groups?.length ?? 0) > 0 ||
                    (searchResults.events?.length ?? 0) > 0 || (searchResults.requests?.length ?? 0) > 0 ||
                    (searchResults.schoolContent?.length ?? 0) > 0) ? (
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
                      {searchResults.groups?.length > 0 && (
                        <div className={styles.searchSection}>
                          <div className={styles.searchSectionTitle}>👥 Groups</div>
                          {searchResults.groups.map(g => (
                            <Link key={g.id} href={g.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                              {g.name}
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
                      {searchResults.schoolContent?.length > 0 && (
                        <div className={styles.searchSection}>
                          <div className={styles.searchSectionTitle}>🏫 Learning</div>
                          {searchResults.schoolContent.map(s => (
                            <Link key={s.id} href={s.url} className={styles.searchResult} onClick={() => setSearchOpen(false)}>
                              {s.title}
                            </Link>
                          ))}
                        </div>
                      )}
                      <Link href={`/sitemap?q=${encodeURIComponent(searchQuery)}`} className={styles.searchViewAll} onClick={() => setSearchOpen(false)}>
                        View all results →
                      </Link>
                    </>
                  ) : (
                    <div className={styles.searchEmpty}>No results found for &quot;{searchQuery}&quot;</div>
                  )}
                </>
              ) : (
                <div className={styles.searchEmpty}>Type to search...</div>
              )}
            </div>
          )}
        </div>

        <button 
          className={styles.menuBtn}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
          <Dropdown 
            label="🚀 Projects" 
            items={projectItems} 
            pathname={pathname}
            onClose={() => setMenuOpen(false)}
          />
          <Link 
            href="/events" 
            className={pathname?.startsWith('/events') ? styles.active : ''}
            onClick={() => setMenuOpen(false)}
          >
            📅 Events
          </Link>
          <Dropdown 
            label="🛒 Marketplace" 
            items={marketplaceItems} 
            pathname={pathname}
            onClose={() => setMenuOpen(false)}
          />
          <Dropdown 
            label="💬 Community" 
            items={communityItems} 
            pathname={pathname}
            onClose={() => setMenuOpen(false)}
          />
          <Link 
            href="/dashboard/overview" 
            className={pathname?.startsWith('/dashboard') ? styles.active : ''}
            onClick={() => setMenuOpen(false)}
          >
            📊 Dashboard
          </Link>
          <Dropdown 
            label="🏫 Learning" 
            items={learningItems} 
            pathname={pathname}
            onClose={() => setMenuOpen(false)}
          />
          <Dropdown 
            label="👤 Account" 
            items={accountItems} 
            pathname={pathname}
            onClose={() => setMenuOpen(false)}
          />
          <Dropdown 
            label="🚚 Courier" 
            items={[{ href: '/courier/setup', icon: '🚚', label: 'Setup' }]} 
            pathname={pathname}
            onClose={() => setMenuOpen(false)}
          />
          {isAdmin && (
            <Dropdown 
              label="Admin ⚙️" 
              items={adminItems} 
              pathname={pathname}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </nav>

        <div className={styles.userSection}>
          <CartButton />
          {notificationCount > 0 && (
            <Link href="/community" className={styles.notificationBtn}>
              <span className={styles.bellIcon}>🔔</span>
              <span className={styles.notificationBadge}>{notificationCount}</span>
            </Link>
          )}
          <div className={styles.userMenu}>
            <button className={styles.userBtn}>
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
                <Link href="/profile" className={styles.userLink} onClick={() => setMenuOpen(false)}>
                  My Profile
                </Link>
                <Link href="/profile/settings" className={styles.userLink} onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <Link href="/dashboard/overview" className={styles.userLink} onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/wallet" className={styles.userLink} onClick={() => setMenuOpen(false)}>
                  Wallet
                </Link>
                <Link href="/orders" className={styles.userLink} onClick={() => setMenuOpen(false)}>
                  Orders
                </Link>
                <Link href="/messages" className={styles.userLink} onClick={() => setMenuOpen(false)}>
                  Messages
                </Link>
                {isAdmin && (
                  <>
                    <div className={styles.adminDivider}>Admin</div>
                    <Link href="/admin/subscribers" className={`${styles.userLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>
                      📧 Subscribers
                    </Link>
                    <Link href="/admin/orders" className={`${styles.userLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>
                      📦 Orders
                    </Link>
                    <Link href="/admin/wallets" className={`${styles.userLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>
                      💳 Wallets
                    </Link>
                    <Link href="/admin/messages" className={`${styles.userLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>
                      💬 Messages
                    </Link>
                    <Link href="/admin/invite-codes" className={`${styles.userLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>
                      🎟️ Invite Codes
                    </Link>
                    <Link href="/admin/users" className={`${styles.userLink} ${styles.adminLink}`} onClick={() => setMenuOpen(false)}>
                      👤 Users
                    </Link>
                  </>
                )}
              </div>
              <button onClick={() => signOut()} className={styles.signOutBtn}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}