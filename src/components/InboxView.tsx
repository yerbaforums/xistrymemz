'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './InboxView.module.css'

interface InboxItem {
  id: string
  type: 'DM' | 'CONNECTION' | 'OFFER' | 'COLLAB'
  fromUser: { id: string; name: string | null; image: string | null }
  message: string | null
  status: string
  createdAt: string
  entity?: { type: string; id: string; title: string } | null
  actions: string[]
}

const TYPE_ICONS: Record<string, string> = {
  DM: '💬',
  CONNECTION: '🤝',
  OFFER: '🔄',
  COLLAB: '🤲',
}

const TYPE_LABELS: Record<string, string> = {
  DM: 'Message',
  CONNECTION: 'Connection Request',
  OFFER: 'Barter Offer',
  COLLAB: 'Collaboration Request',
}

const FILTER_TABS = [
  { key: '', label: 'All', icon: '📬' },
  { key: 'DM', label: 'Messages', icon: '💬' },
  { key: 'CONNECTION', label: 'Connections', icon: '🤝' },
  { key: 'OFFER', label: 'Offers', icon: '🔄' },
  { key: 'COLLAB', label: 'Collab', icon: '🤲' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function entityHref(type: string, id: string): string {
  switch (type) {
    case 'PRODUCT': return `/products/${id}`
    case 'EVENT': return `/events/${id}`
    case 'GROUP': return `/groups/${id}`
    case 'PLAN': return `/plans/${id}`
    default: return '#'
  }
}

export default function InboxView({ onChatUser }: { onChatUser?: (userId: string) => void }) {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox')
      const data = await res.json()
      setItems(data.items || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInbox()
    const interval = setInterval(fetchInbox, 15000)
    return () => clearInterval(interval)
  }, [fetchInbox])

  const handleAction = async (item: InboxItem, action: string) => {
    setActionLoading(item.id)
    try {
      if (item.type === 'CONNECTION') {
        await fetch(`/api/community/connections/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' }),
        })
      } else if (item.type === 'OFFER') {
        await fetch(`/api/offers/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' }),
        })
      } else if (item.type === 'COLLAB') {
        await fetch('/api/collab-requests', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' }),
        })
      }
      fetchInbox()
    } catch { /* ignore */ }
    setActionLoading(null)
  }

  const filtered = filter ? items.filter(i => i.type === filter) : items

  if (loading) {
    return <div className={styles.loading}>Loading inbox...</div>
  }

  return (
    <div className={styles.inbox}>
      <div className={styles.tabs}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${filter === tab.key ? styles.tabActive : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.icon} {tab.label}
            {!tab.key && items.length > 0 && (
              <span className={styles.count}>{items.length}</span>
            )}
            {tab.key && items.filter(i => i.type === tab.key).length > 0 && (
              <span className={styles.count}>{items.filter(i => i.type === tab.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>No items yet</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(item => (
            <div key={`${item.type}-${item.id}`} className={styles.item}>
              <div className={styles.itemLeft}>
                {item.fromUser.image ? (
                  <Image src={item.fromUser.image} alt="" width={40} height={40} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {(item.fromUser.name || '?')[0]}
                  </div>
                )}
              </div>
              <div className={styles.itemBody}>
                <div className={styles.itemHeader}>
                  <strong>{item.fromUser.name || 'Unknown'}</strong>
                  <span className={styles.typeBadge}>{TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}</span>
                  <span className={styles.time}>{timeAgo(item.createdAt)}</span>
                </div>
                {item.message && <p className={styles.itemMessage}>{item.message}</p>}
                {item.entity && (
                  <Link href={entityHref(item.entity.type, item.entity.id)} className={styles.entityRef}>
                    📎 {item.entity.title || item.entity.type}
                  </Link>
                )}
                <div className={styles.itemActions}>
                  {item.actions.includes('accept') && (
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleAction(item, 'accept')}
                      disabled={actionLoading === item.id}
                    >
                      Accept
                    </button>
                  )}
                  {item.actions.includes('decline') && (
                    <button
                      className={styles.declineBtn}
                      onClick={() => handleAction(item, 'decline')}
                      disabled={actionLoading === item.id}
                    >
                      Decline
                    </button>
                  )}
                  {item.actions.includes('reply') && onChatUser && (
                    <button className={styles.replyBtn} onClick={() => onChatUser(item.fromUser.id)}>
                      Reply
                    </button>
                  )}
                  {item.actions.includes('view') && item.entity && (
                    <Link href={entityHref(item.entity.type, item.entity.id)} className={styles.viewBtn}>
                      View
                    </Link>
                  )}
                  {item.actions.includes('counter') && item.entity && (
                    <Link href={`/dashboard/offers`} className={styles.replyBtn}>
                      Counter
                    </Link>
                  )}
                  {item.actions.includes('message') && onChatUser && (
                    <button className={styles.replyBtn} onClick={() => onChatUser(item.fromUser.id)}>
                      Message
                    </button>
                  )}
                </div>
              </div>
              {item.type !== 'DM' && item.status === 'PENDING' && (
                <span className={styles.pendingDot} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
