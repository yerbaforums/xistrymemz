'use client'

import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useUserPreferences } from '@/hooks/useUserPreferences'

const NOTIFICATION_TYPES = [
  { id: 'messages', label: 'Messages', description: 'When someone sends you a message', icon: '💬' },
  { id: 'connection_requests', label: 'Connection Requests', description: 'When someone wants to connect', icon: '👋' },
  { id: 'offers', label: 'Offers & Trades', description: 'When you receive an offer or trade request', icon: '🤝' },
  { id: 'appointments', label: 'Appointments', description: 'When someone books or cancels an appointment', icon: '📅' },
  { id: 'orders', label: 'Orders & Payments', description: 'When you receive an order or payment', icon: '📦' },
  { id: 'requests', label: 'Requests & Fulfillments', description: 'When someone fulfills your request or responds to yours', icon: '📝' },
  { id: 'comments', label: 'Comments & Replies', description: 'When someone replies to your content', icon: '💭' },
  { id: 'mentions', label: 'Mentions', description: 'When someone mentions you', icon: '@' },
  { id: 'follows', label: 'New Followers', description: 'When someone follows you', icon: '👤' },
  { id: 'blogs', label: 'Blog Posts', description: 'When a blog you follow publishes', icon: '✍️' },
  { id: 'school', label: 'School Lessons', description: 'When a school you joined publishes', icon: '🎓' },
  { id: 'system', label: 'System Updates', description: 'Platform announcements and updates', icon: '🔔' },
]

const PUSH_TYPES = [
  { id: 'in_app', label: 'In-App', description: 'Show notifications inside the app', icon: '💻' },
  { id: 'email', label: 'Email', description: 'Send booking-request emails to your inbox', icon: '📧' },
  { id: 'push', label: 'Push', description: 'Send push notifications to your device', icon: '📱' },
]

export default function NotificationsSettingsPage() {
  const router = useRouter()
  const { prefs, loaded, setPreference } = useUserPreferences()

  if (loaded && !prefs) {
    router.push('/auth/login')
    return null
  }

  return (
    <div>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Settings', href: '/settings' }, { label: 'Notifications' }]} />
        <h1>Notification Settings</h1>
        <p>Control what notifications you receive and how they are delivered</p>
      </div>

      <section className={styles.section}>
        <h2>Notification Types</h2>
        <div className={styles.list}>
          {NOTIFICATION_TYPES.map(nt => (
            <label key={nt.id} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowIcon}>{nt.icon}</span>
                <div>
                  <strong>{nt.label}</strong>
                  <p>{nt.description}</p>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${prefs?.notifications?.[nt.id] !== false ? styles.toggleOn : ''}`}
                onClick={() =>
                  setPreference({
                    notifications: { [nt.id]: prefs?.notifications?.[nt.id] === false },
                  })
                }
                role="switch"
                aria-checked={prefs?.notifications?.[nt.id] !== false}
                aria-label={`${nt.label} notifications`}
              >
                <span className={styles.toggleKnob} />
              </button>
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Delivery Methods</h2>
        <div className={styles.list}>
          {PUSH_TYPES.map(pt => (
            <label key={pt.id} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowIcon}>{pt.icon}</span>
                <div>
                  <strong>{pt.label}</strong>
                  <p>{pt.description}</p>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${prefs?.delivery?.[pt.id] !== false ? styles.toggleOn : ''}`}
                onClick={() =>
                  setPreference({
                    delivery: { [pt.id]: prefs?.delivery?.[pt.id] === false },
                  })
                }
                role="switch"
                aria-checked={prefs?.delivery?.[pt.id] !== false}
                aria-label={`${pt.label} delivery`}
              >
                <span className={styles.toggleKnob} />
              </button>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}