'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { NAV } from '@/lib/navigation'
import { useTheme, type ThemeAccent } from '@/context/ThemeContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { getUserProfileUrl } from '@/lib/utils'
import styles from './Header.module.css'

interface UserDropdownProps {
  session: any
  open: boolean
  onClose: () => void
  traveling: boolean
}

export default function UserDropdown({ session, open, onClose, traveling }: UserDropdownProps) {
  const { mode, accent, setAccent, toggleMode } = useTheme()
  const { settings } = useSiteSettings()

  if (!open) return null

  return (
    <div className={styles.userDropdown} id="user-menu-dropdown" role="menu">
      <div className={styles.userInfo}>
        <strong>{session.user?.name || 'User'}</strong>
        <span className={styles.userEmail}>{session.user?.email}</span>
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
        <div className={styles.userSectionLabel}>Profile</div>
        <Link href={session?.user ? getUserProfileUrl({ id: session.user.id, username: session.user?.username }) : '/auth/login'} className={styles.userLink} role="menuitem" onClick={onClose}>
          <span aria-hidden="true">👤</span> My Profile
        </Link>
        <Link href="/profile/settings" className={styles.userLink} role="menuitem" onClick={onClose}>
          <span aria-hidden="true">⚙️</span> Settings
        </Link>
        <Link href="/onboarding" className={styles.userLink} role="menuitem" onClick={onClose}>🚀 Getting Started</Link>

        <div className={styles.userDivider} />
        <div className={styles.userSectionLabel}>Dashboard</div>
        {NAV.main.slice(0, 4).map(item => (
          <Link key={item.href} href={item.href} className={styles.userLink} role="menuitem" onClick={onClose}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        ))}
        <Link href="/dashboard/messages" className={styles.userLink} role="menuitem" onClick={onClose}>
          <span aria-hidden="true">💬</span> Messages
        </Link>
        <Link href="/dashboard/saved" className={styles.userLink} role="menuitem" onClick={onClose}>
          <span aria-hidden="true">⭐</span> Saved
        </Link>

        <div className={styles.userDivider} />
        <div className={styles.userSectionLabel}>Content</div>
        {settings.enableWallet ? (
          <Link href="/wallet" className={styles.userLink} role="menuitem" onClick={onClose}>
            <span aria-hidden="true">💰</span> Wallet
          </Link>
        ) : (
          <span className={`${styles.userLink} ${styles.disabled}`} role="menuitem" aria-disabled="true">
            <span aria-hidden="true">💰</span> Wallet (Coming Soon)
          </span>
        )}
        <Link href="/orders" className={styles.userLink} role="menuitem" onClick={onClose}>
          <span aria-hidden="true">📦</span> Orders
        </Link>

        <div className={styles.userDivider} />
        <div className={styles.userSectionLabel}>Business</div>
        {NAV.more.filter(m => m.href === '/courier/setup' || m.href === '/templates').map(item => (
          <Link key={item.href} href={item.href} className={styles.userLink} role="menuitem" onClick={onClose}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        ))}
      </div>
      <button onClick={() => signOut()} className={styles.signOutBtn} role="menuitem">Sign Out</button>
    </div>
  )
}
