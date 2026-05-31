import Link from 'next/link'
import styles from './layout.module.css'

const SETTINGS_SECTIONS = [
  { href: '/profile/settings', icon: '🏠', label: 'All Settings' },
  { href: '/profile/edit', icon: '✏️', label: 'Edit Profile' },
  { href: '/settings/account', icon: '⚙️', label: 'Account' },
  { href: '/settings/notifications', icon: '🔔', label: 'Notifications' },
  { href: '/settings/privacy', icon: '🔒', label: 'Privacy' },
  { href: '/wallet', icon: '💳', label: 'Wallet' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <nav aria-label="Settings navigation">
          <h2 className={styles.sidebarTitle}>Settings</h2>
          <ul className={styles.navList}>
            {SETTINGS_SECTIONS.map(section => (
              <li key={section.href}>
                <Link href={section.href} className={styles.navLink}>
                  <span className={styles.navIcon}>{section.icon}</span>
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
