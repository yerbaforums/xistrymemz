'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { NAV } from '@/lib/navigation'
import { useTheme, type ThemeAccent } from '@/context/ThemeContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { getUserProfileUrl } from '@/lib/utils'
import styles from './Header.module.css'

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
  isAdmin: boolean
  isAuthenticated: boolean
  session: any
}

export default function MobileNav({ open, onClose, isAdmin, isAuthenticated, session }: MobileNavProps) {
  const currentLocale = useLocale()
  const { mode, accent, setAccent, toggleMode } = useTheme()
  const { settings } = useSiteSettings()

  return (
    <div className={`${styles.mobileNav} ${open ? styles.mobileNavOpen : ''}`} id="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className={styles.mobileNavHeader}>
        <Image src="/logo.png" alt="XistrYmemZ" width={28} height={28} />
        <span>XistrYmemZ</span>
        <button className={styles.mobileClose} onClick={onClose} aria-label="Close menu">✕</button>
      </div>

      <div className={styles.mobileSearchWrap}>
        <form
          onSubmit={e => {
            e.preventDefault()
            const q = (e.currentTarget.elements[0] as HTMLInputElement).value
            if (q.trim().length >= 2) {
              onClose()
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
        <Link href="/" className={styles.mobileLink} onClick={onClose}><span aria-hidden="true">🏠</span> Home</Link>
        {NAV.explore.map(item => (
          <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={onClose}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        ))}
        {NAV.community.map(item => (
          <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={onClose}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.mobileSection}>
        <div className={styles.mobileSectionTitle}>Language</div>
        <div className={styles.mobileLangRow}>
          {LOCALES.map(l => (
            <Link
              key={l.code}
              href={l.code === 'en' ? '/' : `/${l.code}`}
              className={`${styles.mobileLangLink} ${l.code === currentLocale ? styles.mobileLangActive : ''}`}
              onClick={onClose}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.mobileSection}>
        <div className={styles.mobileSectionTitle}>Theme</div>
        <div className={styles.mobileThemeRow}>
          <button className={styles.mobileThemeToggle} onClick={toggleMode}>
            {mode === 'dark' ? <><span aria-hidden="true">☀️</span> Light Mode</> : <><span aria-hidden="true">🌙</span> Dark Mode</>}
          </button>
        </div>
        <div className={styles.mobileAccentRow}>
          {(['cyan', 'purple', 'green', 'orange', 'pink', 'blue'] as ThemeAccent[]).map(c => (
            <button
              key={c}
              className={`${styles.mobileAccentDot} ${accent === c ? styles.mobileAccentDotActive : ''}`}
              data-accent={c}
              onClick={() => { setAccent(c); onClose() }}
              aria-label={`${c} accent`}
            />
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <>
          <div className={styles.mobileSection}>
            <div className={styles.mobileSectionTitle}>Dashboard</div>
            {NAV.dashboard.filter(item => !('walletRequired' in item) || (item as any).walletRequired !== true || settings.enableWallet).map(item => (
              <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={onClose}>
                <span aria-hidden="true">{item.icon}</span> {item.label}
              </Link>
            ))}
            <Link href={session?.user ? getUserProfileUrl({ id: session.user.id, username: session.user?.username }) : '/auth/login'} className={styles.mobileLink} onClick={onClose}>
              <span aria-hidden="true">👤</span> Profile
            </Link>
            <Link href="/profile/settings" className={styles.mobileLink} onClick={onClose}>
              <span aria-hidden="true">⚙️</span> Settings
            </Link>
            <Link href="/onboarding" className={styles.mobileLink} onClick={onClose}>🚀 Getting Started</Link>
          </div>

          {isAdmin && (
            <div className={styles.mobileSection}>
              <div className={`${styles.mobileSectionTitle} ${styles.adminSection}`}>Admin</div>
              {NAV.admin.map(item => (
                <Link key={item.href} href={item.href} className={`${styles.mobileLink} ${styles.adminLink}`} onClick={onClose}>
                  {item.icon} {item.label}
                </Link>
              ))}
            </div>
          )}

          <div className={styles.mobileSection}>
            <button className={styles.mobileSignOut} onClick={() => { onClose(); signOut() }}>
              Sign Out
            </button>
          </div>
        </>
      ) : (
        <div className={styles.mobileSection}>
          <div className={styles.mobileAuthButtons}>
            <Link href="/auth/login" className={styles.mobileLoginBtn} onClick={onClose}>Log In</Link>
            <Link href="/auth/register" className={styles.mobileSignupBtn} onClick={onClose}>Sign Up</Link>
          </div>
        </div>
      )}
    </div>
  )
}
