import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './layout.module.css'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/dashboard/overview')
  }

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navLink}>
            ← Dashboard
          </Link>
          <div className={styles.navDivider} />
          <Link href="/admin/subscribers" className={styles.navLink}>
            📧 Subscribers
          </Link>
          <Link href="/admin/orders" className={styles.navLink}>
            📦 Orders
          </Link>
          <Link href="/admin/wallets" className={styles.navLink}>
            💳 Wallets
          </Link>
          <Link href="/admin/messages" className={styles.navLink}>
            💬 Messages
          </Link>
          <Link href="/admin/invite-codes" className={styles.navLink}>
            🎟️ Invites
          </Link>
          <Link href="/admin/users" className={styles.navLink}>
            👤 Users
          </Link>
        </nav>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
