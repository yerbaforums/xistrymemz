'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TariWalletButton } from './TariWalletButton'
import styles from './PublicHeader.module.css'

export default function PublicHeader() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const isAuthPage = pathname?.startsWith('/auth')

  if (isAuthPage || status === 'loading') {
    return null
  }

  if (session) {
    return null
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/dashboard" className={styles.logo}>
          <img src="/logo.png" alt="XistrYmemZ" />
          XistrYmemZ
        </Link>

        <nav className={styles.nav}>
          <Link href="/about" className={styles.navLink}>
            About
          </Link>
          <Link href="/help" className={styles.navLink}>
            Help
          </Link>
          <Link href="/contact" className={styles.navLink}>
            Contact
          </Link>
          <Link href="/events" className={styles.navLink}>
            Events
          </Link>
          <Link href="/shops" className={styles.navLink}>
            Shops
          </Link>
          <Link href="/sitemap" className={styles.navLink}>
            Site Map
          </Link>
        </nav>

        <div className={styles.authLinks}>
          <TariWalletButton />
          <Link href="/auth/login" className={styles.loginBtn}>
            Login
          </Link>
          <Link href="/auth/register" className={styles.signupBtn}>
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  )
}
