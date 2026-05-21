'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { getUserProfileUrl } from '@/lib/utils'
import styles from './page.module.css'

interface ConnectionUser {
  id: string
  name: string | null
  image: string | null
  username: string | null
}

interface Connection {
  id: string
  status: string
  message: string | null
  createdAt: string
  requester: ConnectionUser
  receiver: ConnectionUser
}

interface ForumPost {
  id: string
  title: string
  content: string
  viewCount: number
  replyCount: number
  pinned: boolean
  locked: boolean
  createdAt: string
  category: { id: string; name: string; slug: string } | null
  author: { id: string; name: string | null }
}

export default function CommunityManagement() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('connections')
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([])
  const [pendingSent, setPendingSent] = useState<Connection[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<Connection[]>([])
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [receivedRes, sentRes, acceptedRes, forumRes] = await Promise.all([
        fetch('/api/community/connections?filter=pending'),
        fetch('/api/community/connections?filter=sent'),
        fetch('/api/community/connections?filter=accepted'),
        session?.user?.id
          ? fetch(`/api/forum/posts?authorId=${session.user.id}&limit=20`)
          : Promise.resolve(null),
      ])
      if (receivedRes.ok) setPendingReceived(await receivedRes.json())
      if (sentRes.ok) setPendingSent(await sentRes.json())
      if (acceptedRes.ok) setAcceptedConnections(await acceptedRes.json())
      if (forumRes?.ok) setForumPosts(await forumRes.json())
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user) fetchData()
  }, [session, fetchData])

  const handleResponse = async (connectionId: string, action: 'ACCEPTED' | 'REJECTED') => {
    setUpdating(connectionId)
    try {
      const res = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })
      if (res.ok) {
        setPendingReceived(prev => prev.filter(c => c.id !== connectionId))
        if (action === 'ACCEPTED') fetchData()
      }
    } catch {
      /* ignore */
    } finally {
      setUpdating(null)
    }
  }

  const cancelRequest = async (connectionId: string) => {
    setUpdating(connectionId)
    try {
      const res = await fetch(`/api/community/connections/${connectionId}`, { method: 'DELETE' })
      if (res.ok) setPendingSent(prev => prev.filter(c => c.id !== connectionId))
    } catch {
      /* ignore */
    } finally {
      setUpdating(null)
    }
  }

  const otherUser = (c: Connection) =>
    c.requester.id === session?.user?.id ? c.receiver : c.requester

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>👥 Community Management</h1>
        <p className={styles.subtitle}>Manage connections and forum posts</p>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{pendingReceived.length}</div>
          <div className={styles.statLabel}>Pending Requests</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{acceptedConnections.length}</div>
          <div className={styles.statLabel}>Connections</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{forumPosts.length}</div>
          <div className={styles.statLabel}>Forum Posts</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{forumPosts.reduce((s, p) => s + p.replyCount, 0)}</div>
          <div className={styles.statLabel}>Total Replies</div>
        </div>
      </div>

      <div className={styles.tabs}>
        {[
          { key: 'connections', icon: '🤝', label: 'Connections' },
          { key: 'forum', icon: '💬', label: 'Forum Posts' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`${styles.tab} ${activeTab === t.key ? styles.active : ''}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'connections' && (
        <>
          {pendingReceived.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>📩 Pending Requests</h3>
              </div>
              {pendingReceived.map(c => {
                const user = otherUser(c)
                return (
                  <div key={c.id} className={styles.card}>
                    <div className={styles.avatar}>
                      {user.image ? (
                        <Image src={user.image} alt="" width={40} height={40} />
                      ) : (
                        <span>{user.name?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className={styles.info}>
                      <div className={styles.name}>{user.name || 'Anonymous'}</div>
                      <div className={styles.meta}>{new Date(c.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleResponse(c.id, 'ACCEPTED')}
                        disabled={updating === c.id}
                        className={styles.acceptBtn}
                      >
                        {updating === c.id ? '...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleResponse(c.id, 'REJECTED')}
                        disabled={updating === c.id}
                        className={styles.declineBtn}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {pendingSent.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>📨 Sent Requests</h3>
              </div>
              {pendingSent.map(c => {
                const user = otherUser(c)
                return (
                  <div key={c.id} className={styles.card}>
                    <div className={styles.avatar}>
                      {user.image ? (
                        <Image src={user.image} alt="" width={40} height={40} />
                      ) : (
                        <span>{user.name?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className={styles.info}>
                      <div className={styles.name}>{user.name || 'Anonymous'}</div>
                      <div className={styles.meta}>Sent {new Date(c.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className={styles.actions}>
                      <button
                        onClick={() => cancelRequest(c.id)}
                        disabled={updating === c.id}
                        className={styles.declineBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>✅ My Connections ({acceptedConnections.length})</h3>
              <Link href="/community" className={styles.actionBtn}>Browse Members</Link>
            </div>
            {acceptedConnections.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No connections yet</p>
                <Link href="/community" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>Find members to connect with →</Link>
              </div>
            ) : (
              acceptedConnections.slice(0, 10).map(c => {
                const user = otherUser(c)
                return (
                  <Link key={c.id} href={getUserProfileUrl(user)} className={styles.card}>
                    <div className={styles.avatar}>
                      {user.image ? (
                        <Image src={user.image} alt="" width={40} height={40} />
                      ) : (
                        <span>{user.name?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className={styles.info}>
                      <div className={styles.name}>{user.name || 'Anonymous'}</div>
                      <div className={styles.meta}>Connected {new Date(c.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`${styles.badge} ${styles.acceptedBadge}`}>Connected</span>
                  </Link>
                )
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'forum' && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>📝 My Forum Posts ({forumPosts.length})</h3>
              <Link href="/community/forum" className={styles.actionBtn}>Browse Forum</Link>
            </div>
            {forumPosts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No forum posts yet</p>
                <Link href="/community/forum" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>Create your first post →</Link>
              </div>
            ) : (
              forumPosts.map(p => (
                <Link key={p.id} href={`/community/forum/${p.id}`} className={styles.card}>
                  <div className={styles.iconCircle} style={{ background: p.pinned ? '#6366f120' : '#6b728020' }}>
                    {p.pinned ? '📌' : '💬'}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.titleRow}>
                      <span className={styles.name}>{p.title}</span>
                      {p.pinned && <span className={`${styles.badge} ${styles.pendingBadge}`}>Pinned</span>}
                      {p.locked && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>🔒 Locked</span>}
                    </div>
                    <div className={styles.meta}>
                      {p.category?.name || 'Uncategorized'} · {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                    <div className={styles.statsRow}>
                      <span>👁️ {p.viewCount} views</span>
                      <span>💬 {p.replyCount} replies</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
