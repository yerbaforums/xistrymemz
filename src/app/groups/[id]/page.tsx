'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from './page.module.css'

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; image: string | null; email: string }
}

interface ActivityItem {
  id: string
  title: string
  description: string | null
  status?: string
  type?: string
  category?: string | null
  location?: string | null
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
  [key: string]: unknown
}

interface Activity {
  projects: ActivityItem[]
  requests: ActivityItem[]
  products: ActivityItem[]
  events: ActivityItem[]
}

interface Post {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  user: { id: string; name: string | null; image: string | null }
  members: Member[]
  posts: Post[]
  _count: { members: number; posts: number }
  isMember: boolean
  isAdmin: boolean
}

function GroupDetailContent() {
  const params = useParams()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'activity'>('posts')
  const [activity, setActivity] = useState<Activity>({ projects: [], requests: [], products: [], events: [] })
  const [loadingActivity, setLoadingActivity] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user?.id) setUserId(data.user.id)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/groups/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setGroup(null)
        } else {
          setGroup(data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'activity' && group?.isMember) {
      setLoadingActivity(true)
      fetch(`/api/groups/${params.id}/members-activity`)
        .then(res => res.json())
        .then(data => {
          setActivity(data)
          setLoadingActivity(false)
        })
        .catch(() => setLoadingActivity(false))
    }
  }, [activeTab, group?.isMember, params.id])

  const handleJoin = async () => {
    console.log('userId state:', userId)
    if (!userId) {
      alert('Please log in to join this group')
      return
    }
    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/join`, { method: 'POST' })
      const data = await res.json()
      console.log('Join response:', res.status, data)
      if (res.ok) {
        setGroup(g => g ? { ...g, isMember: true, members: [...g.members, data], _count: { ...g._count, members: g._count.members + 1 } } : g)
      } else {
        alert(data.error + (data.debug_userId ? '\n\nDebug: userId=' + data.debug_userId : ''))
      }
    } catch (error) {
      console.error('Failed to join:', error)
      alert('Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!userId) return
    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/join`, { method: 'DELETE' })
      if (res.ok) {
        setGroup(g => g ? { ...g, isMember: false, members: g.members.filter(m => m.user.id !== userId), _count: { ...g._count, members: g._count.members - 1 } } : g)
      }
    } catch (error) {
      console.error('Failed to leave:', error)
    } finally {
      setJoining(false)
    }
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postContent.trim() || !userId) return
    
    setPosting(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent })
      })
      
      if (res.ok) {
        const newPost = await res.json()
        setGroup(g => g ? { ...g, posts: [newPost, ...g.posts], _count: { ...g._count, posts: g._count.posts + 1 } } : g)
        setPostContent('')
      }
    } catch (error) {
      console.error('Failed to post:', error)
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!group) return <div className={styles.error}>Group not found</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerImage}>
          {group.imageUrl ? (
            <img src={group.imageUrl} alt={group.name} />
          ) : (
            <div className={styles.placeholderIcon}>👥</div>
          )}
        </div>
        <div className={styles.headerContent}>
          <h1>{group.name}</h1>
          {group.description && <p>{group.description}</p>}
          <div className={styles.headerMeta}>
            <span>👥 {group._count.members} members</span>
            <span>📝 {group._count.posts} posts</span>
            {group.isPrivate && <span>🔒 Private</span>}
          </div>
          {userId && (
            <div className={styles.headerActions}>
              {group.isMember ? (
                <button onClick={handleLeave} disabled={joining} className="btn-secondary">
                  {joining ? 'Leaving...' : 'Leave Group'}
                </button>
              ) : (
                <button onClick={handleJoin} disabled={joining} className="btn-primary">
                  {joining ? 'Joining...' : 'Join Group'}
                </button>
              )}
            </div>
          )}

          {group.isMember && (
            <div className={styles.tabs}>
              <button 
                className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                💬 Posts
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'activity' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                🚀 Member Activity
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          {group.isMember && (
            <div className={styles.postForm}>
              <form onSubmit={handlePost}>
                <textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder="Share something with the group..."
                  rows={3}
                />
                <button type="submit" disabled={posting || !postContent.trim()} className="btn-primary">
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'posts' && (
          <div className={styles.postsList}>
            {group.posts.length === 0 ? (
              <div className={styles.emptyPosts}>
                <p>No posts yet. {group.isMember ? 'Be the first to post!' : 'Join the group to start posting.'}</p>
              </div>
            ) : (
              group.posts.map(post => (
                <div key={post.id} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <div className={styles.postAuthor}>
                      {post.user.image ? (
                        <img src={post.user.image} alt={post.user.name || ''} />
                      ) : (
                        <div className={styles.authorPlaceholder}>
                          {(post.user.name?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                      <span>{post.user.name || 'Unknown'}</span>
                    </div>
                    <span className={styles.postDate}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.postContent}>
                    {post.content}
                  </div>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="Post" className={styles.postImage} />
                  )}
                </div>
              ))
            )}
          </div>
          )}
        </div>

        {activeTab === 'activity' && (
          <div className={styles.activitySection}>
            {loadingActivity ? (
              <div className={styles.loading}>Loading activity...</div>
            ) : (
              <>
                {activity.projects.length > 0 && (
                  <div className={styles.activityGroup}>
                    <h3>🚀 Projects</h3>
                    <div className={styles.activityGrid}>
                      {activity.projects.map(p => (
                        <Link key={p.id} href={`/plans/${p.id}`} className={styles.activityCard}>
                          <span className={styles.activityTitle}>{p.title}</span>
                          <span className={styles.activityMeta}>{p.category} · {p.status}</span>
                          <span className={styles.activityAuthor}>by {p.user.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {activity.requests.length > 0 && (
                  <div className={styles.activityGroup}>
                    <h3>📝 Requests</h3>
                    <div className={styles.activityGrid}>
                      {activity.requests.map(r => (
                        <Link key={r.id} href={`/requests/${r.id}`} className={styles.activityCard}>
                          <span className={styles.activityTitle}>{r.title}</span>
                          <span className={styles.activityMeta}>{r.category} · {r.status}</span>
                          <span className={styles.activityAuthor}>by {r.user.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {activity.products.length > 0 && (
                  <div className={styles.activityGroup}>
                    <h3>🛒 Products</h3>
                    <div className={styles.activityGrid}>
                      {activity.products.map(p => (
                        <Link key={p.id} href={`/products/${p.id}`} className={styles.activityCard}>
                          {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.activityImage} />}
                          <span className={styles.activityTitle}>{p.title}</span>
                          <span className={styles.activityMeta}>${p.price} · {p.type}</span>
                          <span className={styles.activityAuthor}>by {p.user.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {activity.events.length > 0 && (
                  <div className={styles.activityGroup}>
                    <h3>📅 Events</h3>
                    <div className={styles.activityGrid}>
                      {activity.events.map(e => (
                        <Link key={e.id} href={`/events/${e.id}`} className={styles.activityCard}>
                          <span className={styles.activityTitle}>{e.title}</span>
                          <span className={styles.activityMeta}>{e.eventDate ? new Date(e.eventDate).toLocaleDateString() : ''} · {e.location}</span>
                          <span className={styles.activityAuthor}>{e.joinerCount} attending</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {activity.projects.length === 0 && activity.requests.length === 0 && 
                 activity.products.length === 0 && activity.events.length === 0 && (
                  <div className={styles.emptyPosts}>
                    <p>No member activity yet.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.sidebar}>
          <div className={styles.membersCard}>
            <h3>Members ({group._count.members})</h3>
            <div className={styles.membersList}>
              {group.members.map(member => (
                <Link href={`/profile/${member.user.id}`} key={member.id} className={styles.memberItem}>
                  {member.user.image ? (
                    <img src={member.user.image} alt={member.user.name || ''} />
                  ) : (
                    <div className={styles.memberPlaceholder}>
                      {(member.user.name?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className={styles.memberInfo}>
                    <span>{member.user.name || 'Unknown'}</span>
                    {member.role === 'ADMIN' && <span className={styles.adminBadge}>Admin</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GroupDetailPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <GroupDetailContent />
    </Suspense>
  )
}
