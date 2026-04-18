import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import styles from './settings.module.css'

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.header}>
            <h1>Profile Settings</h1>
            <p>Manage your account and profile information</p>
          </div>

          <div className={styles.grid}>
            <Link href={`/profile/${session.user.id}`} className={styles.card}>
              <span className={styles.cardIcon}>👤</span>
              <h3>View My Profile</h3>
              <p>See how others view your profile</p>
            </Link>

            <Link href="/profile/edit" className={styles.card}>
              <span className={styles.cardIcon}>✏️</span>
              <h3>Edit Profile</h3>
              <p>Update your name, bio, location, and more</p>
            </Link>

            <Link href="/settings/account" className={styles.card}>
              <span className={styles.cardIcon}>⚙️</span>
              <h3>Account Settings</h3>
              <p>Change email, password, and security</p>
            </Link>

            <Link href="/settings/notifications" className={styles.card}>
              <span className={styles.cardIcon}>🔔</span>
              <h3>Notifications</h3>
              <p>Configure email and message alerts</p>
            </Link>

            <Link href="/wallet" className={styles.card}>
              <span className={styles.cardIcon}>💳</span>
              <h3>Wallet</h3>
              <p>Manage your crypto wallet and balances</p>
            </Link>

            <Link href="/settings/privacy" className={styles.card}>
              <span className={styles.cardIcon}>🔒</span>
              <h3>Privacy</h3>
              <p>Control who can see your information</p>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
