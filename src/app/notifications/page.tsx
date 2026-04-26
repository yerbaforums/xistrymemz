'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './page.module.css'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  relatedId: string | null
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  OFFER_RECEIVED: '🤝',
  OFFER_ACCEPTED: '✅',
  OFFER_REJECTED: '❌',
  OFFER_WITHDRAWN: '↩️',
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      const url = filter === 'unread' ? '/api/notifications?unreadOnly=true' : '/api/notifications'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT' })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications?markAllRead=true', { method: 'PUT' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!session) {
    return <div className={styles.container}>Please sign in to view notifications.</div>
  }

  return (
    <div className={styles.container}>
      <h1>🔔 Notifications</h1>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`${styles.item} ${!notification.read ? styles.unread : ''}`}
            >
              <Link
                href={notification.link || '#'}
                className={styles.itemContent}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <span className={styles.icon}>
                  {TYPE_ICONS[notification.type] || '📢'}
                </span>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{notification.title}</span>
                  <span className={styles.itemMessage}>{notification.message}</span>
                  <span className={styles.itemTime}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
              </Link>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteNotification(notification.id)}
                aria-label="Delete notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}