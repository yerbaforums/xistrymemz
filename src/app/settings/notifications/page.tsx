'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const NOTIFICATION_TYPES = [
  { id: 'messages', label: 'Messages', description: 'When someone sends you a message', icon: '💬' },
  { id: 'connection_requests', label: 'Connection Requests', description: 'When someone wants to connect', icon: '👋' },
  { id: 'offers', label: 'Offers & Trades', description: 'When you receive an offer or trade request', icon: '🤝' },
  { id: 'appointments', label: 'Appointments', description: 'When someone books or cancels an appointment', icon: '📅' },
  { id: 'orders', label: 'Orders & Payments', description: 'When you receive an order or payment', icon: '📦' },
  { id: 'comments', label: 'Comments & Replies', description: 'When someone replies to your content', icon: '💭' },
  { id: 'mentions', label: 'Mentions', description: 'When someone mentions you', icon: '@' },
  { id: 'follows', label: 'New Followers', description: 'When someone follows you', icon: '👤' },
  { id: 'system', label: 'System Updates', description: 'Platform announcements and updates', icon: '🔔' },
]

const PUSH_TYPES = [
  { id: 'in_app', label: 'In-App', description: 'Show notifications inside the app', icon: '💻' },
  { id: 'email', label: 'Email', description: 'Send notification emails', icon: '📧' },
  { id: 'push', label: 'Push', description: 'Send push notifications to your device', icon: '📱' },
]

export default function NotificationsSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('notification_prefs') : null
    if (saved) return JSON.parse(saved)
    return Object.fromEntries(NOTIFICATION_TYPES.map(t => [t.id, true]))
  })
  const [pushEnabled, setPushEnabled] = useState<Record<string, boolean>>(() => ({
    in_app: true,
    email: true,
    push: false,
  }))
  const [saved, setSaved] = useState(false)

  if (!session) {
    router.push('/auth/login')
    return null
  }

  const toggle = (id: string) => {
    const next = { ...enabled, [id]: !enabled[id] }
    setEnabled(next)
    localStorage.setItem('notification_prefs', JSON.stringify(next))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const togglePush = (id: string) => {
    const next = { ...pushEnabled, [id]: !pushEnabled[id] }
    setPushEnabled(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className={styles.header}>
        <h1>Notification Settings</h1>
        <p>Control what notifications you receive and how they are delivered</p>
      </div>

      {saved && <div className={styles.savedBanner}>Preferences saved</div>}

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
                className={`${styles.toggle} ${enabled[nt.id] ? styles.toggleOn : ''}`}
                onClick={() => toggle(nt.id)}
                role="switch"
                aria-checked={enabled[nt.id]}
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
                className={`${styles.toggle} ${pushEnabled[pt.id] ? styles.toggleOn : ''}`}
                onClick={() => togglePush(pt.id)}
                role="switch"
                aria-checked={pushEnabled[pt.id]}
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
