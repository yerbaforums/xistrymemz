import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import styles from './settings.module.css'
import { getUserProfileUrl } from '@/lib/utils'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions)
  const t = await getTranslations('dashboard')

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className={styles.layout}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Settings' },
      ]} />
      <div className={styles.container}>
        <main className={`${styles.main} page-enter`}>
          <div className={styles.header}>
            <h1>{t('title')}</h1>
            <p>Manage your account and profile information</p>
          </div>

          <div className={styles.grid}>
            <Link href={getUserProfileUrl({ id: session.user.id, username: (session.user as { username?: string }).username })} className={styles.card}>
              <span className={styles.cardIcon}>👤</span>
              <h3>{t('profile')}</h3>
              <p>See how others view your profile</p>
            </Link>

            <Link href="/profile/edit" className={styles.card}>
              <span className={styles.cardIcon}>✏️</span>
              <h3>Edit Profile</h3>
              <p>Update your name, bio, location, and more</p>
            </Link>

            <Link href="/settings/account" className={styles.card}>
              <span className={styles.cardIcon}>⚙️</span>
              <h3>{t('settings')}</h3>
              <p>Change email, password, and security</p>
            </Link>

            <Link href="/settings/notifications" className={styles.card}>
              <span className={styles.cardIcon}>🔔</span>
              <h3>{t('notifications')}</h3>
              <p>Configure email and message alerts</p>
            </Link>

            <Link href="/wallet" className={styles.card}>
              <span className={styles.cardIcon}>💳</span>
              <h3>{t('wallet')}</h3>
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
