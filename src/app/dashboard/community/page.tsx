'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getUserProfileUrl } from '@/lib/utils'

import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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

interface GroupMember {
  id: string
  role: string
  userId: string
}

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
  _count: { members: number; posts: number }
  members: GroupMember[]
}

type TabKey = 'overview' | 'connections' | 'groups' | 'forum'

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'overview', icon: '🌐', label: 'Overview' },
  { key: 'connections', icon: '🤝', label: 'Connections' },
  { key: 'groups', icon: '👥', label: 'Groups' },
  { key: 'forum', icon: '💬', label: 'Forum' },
]

export default function CommunityManagement() {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([])
  const [pendingSent, setPendingSent] = useState<Connection[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<Connection[]>([])
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [receivedRes, sentRes, acceptedRes, forumRes, groupsRes] = await Promise.all([
        fetch('/api/community/connections?filter=pending'),
        fetch('/api/community/connections?filter=sent'),
        fetch('/api/community/connections?filter=accepted'),
        session?.user?.id
          ? fetch(`/api/forum/posts?authorId=${session.user.id}&limit=20`)
          : Promise.resolve(null),
        fetch('/api/groups?my=true'),
      ])
      if (receivedRes.ok) { const d = await receivedRes.json(); setPendingReceived(d?.data ?? d ?? []) }
      if (sentRes.ok) { const d = await sentRes.json(); setPendingSent(d?.data ?? d ?? []) }
      if (acceptedRes.ok) { const d = await acceptedRes.json(); setAcceptedConnections(d?.data ?? d ?? []) }
      if (forumRes?.ok) {
        const forumData = await forumRes.json()
        setForumPosts(forumData?.data ?? forumData?.items ?? forumData ?? [])
      }
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData?.items ?? groupsData?.data ?? groupsData ?? [])
      }
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

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return
    setDeletingGroup(deleteGroupTarget)
    try {
      const res = await fetch(`/api/groups/${deleteGroupTarget}`, { method: 'DELETE' })
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== deleteGroupTarget))
      }
    } catch {
      /* ignore */
    } finally {
      setDeletingGroup(null)
      setDeleteGroupTarget(null)
    }
  }

  const otherUser = (c: Connection) =>
    c.requester.id === session?.user?.id ? c.receiver : c.requester

  const isAdmin = (g: Group) => g.members.some(m => m.userId === session?.user?.id && m.role === 'ADMIN')
  const isOwner = (g: Group) => g.user.id === session?.user?.id

  const ownerGroups = groups.filter(g => isOwner(g))
  const memberGroups = groups.filter(g => !isOwner(g))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>🌐 Community</h1>
        <p className={styles.subtitle}>Manage connections, groups, and forum activity</p>
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
          <div className={styles.statValue}>{groups.length}</div>
          <div className={styles.statLabel}>Groups</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{forumPosts.length}</div>
          <div className={styles.statLabel}>Forum Posts</div>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`${styles.tab} ${activeTab === t.key ? styles.active : ''}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className={styles.section}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Quick access to all community features
          </p>
          <div className={styles.linkGrid}>
            <Link href="/community" className={styles.linkCard}>
              <span className={styles.linkIcon}>👤</span>
              <span className={styles.linkLabel}>Browse Members</span>
              <span className={styles.linkDesc}>Find and connect with other members</span>
            </Link>
            <Link href="/community/forum" className={styles.linkCard}>
              <span className={styles.linkIcon}>💬</span>
              <span className={styles.linkLabel}>Forum</span>
              <span className={styles.linkDesc}>Join discussions and create posts</span>
            </Link>
            <Link href="/community/groups" className={styles.linkCard}>
              <span className={styles.linkIcon}>👥</span>
              <span className={styles.linkLabel}>Groups</span>
              <span className={styles.linkDesc}>Discover and join groups</span>
            </Link>
            <Link href="/groups/new" className={styles.linkCard}>
              <span className={styles.linkIcon}>➕</span>
              <span className={styles.linkLabel}>Create Group</span>
              <span className={styles.linkDesc}>Start a new community group</span>
            </Link>
            <Link href="/connections" className={styles.linkCard}>
              <span className={styles.linkIcon}>🔗</span>
              <span className={styles.linkLabel}>Connections</span>
              <span className={styles.linkDesc}>Manage connection requests</span>
            </Link>
          </div>
        </div>
      )}

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
              <EmptyState icon="🤝" title="No connections yet" description="Find members to connect with." action={{ label: 'Find Members', onClick: () => router.push('/community') }} />
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

      {activeTab === 'groups' && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>👑 My Groups (Admin)</h3>
              <Link href="/groups/new" className={styles.actionBtn}>+ Create Group</Link>
            </div>
            {ownerGroups.length === 0 ? (
              <EmptyState icon="👥" title="No groups owned" description="Create your first group to start a community." action={{ label: 'Create Group', onClick: () => router.push('/groups/new') }} />
            ) : (
              ownerGroups.map(g => (
                <div key={g.id} className={styles.card}>
                  <div className={styles.iconCircle} style={{ background: '#6366f120' }}>
                    👥
                  </div>
                  <div className={styles.info}>
                    <div className={styles.name}>{g.name}</div>
                    <div className={styles.meta}>
                      {g._count.members} members · {g._count.posts} posts · {g.isPrivate ? '🔒 Private' : '🌍 Public'}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Link href={`/groups/${g.id}`} className={styles.actionBtn}>View</Link>
                    <button
                      onClick={() => setDeleteGroupTarget(g.id)}
                      disabled={deletingGroup === g.id}
                      className={styles.deleteBtn}
                    >
                      {deletingGroup === g.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>✅ Joined Groups</h3>
              <Link href="/community/groups" className={styles.actionBtn}>Browse Groups</Link>
            </div>
            {memberGroups.length === 0 ? (
              <EmptyState icon="👥" title="No groups joined" description="Discover groups to join." action={{ label: 'Discover Groups', onClick: () => router.push('/community/groups') }} />
            ) : (
              memberGroups.map(g => (
                <Link key={g.id} href={`/groups/${g.id}`} className={styles.card}>
                  <div className={styles.iconCircle} style={{ background: '#22c55e20' }}>
                    👥
                  </div>
                  <div className={styles.info}>
                    <div className={styles.name}>{g.name}</div>
                    <div className={styles.meta}>
                      {g._count.members} members · by {g.user.name || 'Unknown'} · {g.isPrivate ? '🔒 Private' : '🌍 Public'}
                    </div>
                  </div>
                  <span className={`${styles.badge} ${styles.acceptedBadge}`}>Member</span>
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'forum' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>📝 My Forum Posts ({forumPosts.length})</h3>
            <Link href="/community/forum" className={styles.actionBtn}>Browse Forum</Link>
          </div>
          {forumPosts.length === 0 ? (
            <EmptyState icon="💬" title="No forum posts yet" description="Create your first post to start a discussion." action={{ label: 'Browse Forum', onClick: () => router.push('/community/forum') }} />
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
      )}
      <ConfirmDialog
        isOpen={!!deleteGroupTarget}
        onClose={() => setDeleteGroupTarget(null)}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        message="This will permanently delete this group and all its posts, memberships, and data. This cannot be undone."
        confirmLabel="Delete Group"
        variant="danger"
      />
    </div>
  )
}
