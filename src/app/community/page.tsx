'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import styles from './community.module.css'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonList } from '@/components/Skeleton'
import { getUserProfileUrl } from '@/lib/utils'
import RoleBadge from '@/components/RoleBadge'
import ActiveStatus from '@/components/ActiveStatus'
import LookingForCollaboratorsBadge from '@/components/LookingForCollaboratorsBadge'
import Breadcrumbs from '@/components/Breadcrumbs'
import { MapContainer, TileLayer, Marker, Popup } from '@/components/LeafletComponents'
import Button from '@/components/ui/Button'

interface Member {
  id: string
  name: string | null
  email: string
  image: string | null
  bio: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  userClass: string | null
  role: string
  username: string | null
  shopSlug: string | null
  createdAt: string
  lastActiveAt: string | null
  lookingForCollaborators: boolean
  planCount?: number
  requestCount?: number
  productCount?: number
  connectionCount?: number
  postCount?: number
}

const CLASS_ICONS: Record<string, string> = {
  Healer: '💚', Revealer: '👁️', Seer: '🔮', Teacher: '📚',
  Guide: '🧭', Warrior: '⚔️', Guardian: '🛡️', Sage: '🦉',
  Mystic: '✨', Architect: '🏗️', Artist: '🎨', Builder: '🔨',
  Explorer: '🌍', Mentor: '🌟'
}

interface Connection {
  id: string
  receiverId: string
  requesterId: string
  status: string
  receiver?: Member
  requester?: Member
}

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  _count: { members: number; posts: number }
  isMember: boolean
}

interface Request {
  id: string
  title: string
  description: string | null
  status: string
  budget: number | null
  location: string | null
  latitude: number | null
  longitude: number | null
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

export default function CommunityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error, warning } = useToast()
  const [activeTab, setActiveTab] = useState<'members' | 'connections' | 'requests' | 'groups' | 'marketRequests' | 'forum'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [marketRequests, setMarketRequests] = useState<Request[]>([])
  const [forumCategories, setForumCategories] = useState<{id: string, name: string, slug: string, icon: string, _count: {posts: number}}[]>([])
  const [forumPosts, setForumPosts] = useState<{id: string, title: string, content: string, author: {id: string, name: string, email: string}, category: {name: string, slug: string}, totalTips: number, tippers: number, viewCount: number, replyCount: number, createdAt: string}[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [showNewPost, setShowNewPost] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [tipCrypto, setTipCrypto] = useState('USDT')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [tipTarget, setTipTarget] = useState<{type: 'post' | 'user', id: string, authorId: string} | null>(null)
  const [cryptoBalances, setCryptoBalances] = useState<{symbol: string, name: string, available: number, icon: string, color: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [membersRes, groupsRes, requestsRes, forumCatRes, forumPostsRes] = await Promise.all([
        fetch('/api/community/members'),
        fetch('/api/groups'),
        fetch('/api/requests?public=true'),
        fetch('/api/forum/categories'),
        fetch('/api/forum/posts'),
      ])
      
      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.data.members?.items || [])
        setConnections(membersData.data.connections?.items || [])
        setPendingRequests(membersData.data.pendingRequests?.items || [])
      }
      
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData?.items || [])
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        setMarketRequests(requestsData?.items || [])
      }

      if (forumCatRes.ok) {
        const forumData = await forumCatRes.json()
        setForumCategories(forumData?.data || [])
      }

      if (forumPostsRes.ok) {
        const postsData = await forumPostsRes.json()
        setForumPosts(postsData?.data || [])
      }

      const tipRes = await fetch('/api/forum/tip-options')
      if (tipRes.ok) {
        const tipData = await tipRes.json()
        setCryptoBalances(tipData.cryptoBalances || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchForumPosts = async (categoryId?: string) => {
    try {
      const url = categoryId ? `/api/forum/posts?categoryId=${categoryId}` : '/api/forum/posts'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setForumPosts(data?.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreatePost = async () => {
    if (!newPostTitle || !newPostContent || !selectedCategory) {
      warning('Please fill in all fields')
      return
    }
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newPostTitle, content: newPostContent, categoryId: selectedCategory })
      })
      if (res.ok) {
        setShowNewPost(false)
        setNewPostTitle('')
        setNewPostContent('')
        fetchForumPosts(selectedCategory)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTip = async (type: 'post' | 'user', id: string, authorId: string) => {
    const amount = parseFloat(tipAmount)
    if (!amount || amount <= 0) {
      warning('Please enter a valid amount')
      return
    }
    try {
      if (type === 'user') {
        const res = await fetch('/api/users/tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authorId, amount, cryptoSymbol: tipCrypto })
        })
        if (res.ok) {
          success(`Tip sent! ${amount} ${tipCrypto}`)
          setTipTarget(null)
          setTipAmount('')
          fetchData()
        } else {
          const data = await res.json()
          error(data.error || 'Failed to send tip')
        }
        } else {
          const res = await fetch('/api/forum/tip-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: id, amount, cryptoSymbol: tipCrypto })
          })
          if (res.ok) {
            success(`Tip sent! ${amount} ${tipCrypto}`)
            setTipTarget(null)
            setTipAmount('')
            fetchForumPosts(selectedCategory || undefined)
            fetchData()
          } else {
            const errorData = await res.json()
            error(errorData.error || 'Failed to send tip')
          }
        }
    } catch (err) {
      console.error(err)
    }
  }

  const handleConnect = async (userId: string) => {
    try {
      const res = await fetch('/api/community/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId })
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' })
      })
      
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRequests = marketRequests.filter(req => 
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return <SkeletonList count={3} />
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Community' },
      ]} />

      <div className={styles.header}>
        <h1>Community</h1>
        <p>Connect with members globally</p>
      </div>

      <div className={styles.tabs}>
        <Button 
          variant="ghost"
          className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({members.length})
        </Button>
        <Button 
          variant="ghost"
          className={`${styles.tab} ${activeTab === 'connections' ? styles.active : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connections ({connections.length})
        </Button>
        <Button 
          variant="ghost"
          className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Pending ({pendingRequests.length})
        </Button>
        <Button 
          variant="ghost"
          className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups ({groups.length})
        </Button>
        <Button 
          variant="ghost"
          className={`${styles.tab} ${activeTab === 'marketRequests' ? styles.active : ''}`}
          onClick={() => { setActiveTab('marketRequests'); setSearchQuery(''); }}
        >
          Requests ({marketRequests.length})
        </Button>
        <Button 
          variant="ghost"
          className={`${styles.tab} ${activeTab === 'forum' ? styles.active : ''}`}
          onClick={() => { setActiveTab('forum'); }}
        >
          Forum
        </Button>
      </div>

      {activeTab === 'members' && (
        <div className={styles.membersSection}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search members by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.viewToggles} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className={`viewToggle ${viewMode === 'grid' ? 'viewToggleActive' : ''}`} onClick={() => setViewMode('grid')}>▦ Grid</button>
            <button className={`viewToggle ${viewMode === 'list' ? 'viewToggleActive' : ''}`} onClick={() => setViewMode('list')}>☰ List</button>
            <button className={`viewToggle ${viewMode === 'map' ? 'viewToggleActive' : ''}`} onClick={() => setViewMode('map')}>🗺️ Map</button>
          </div>
          {viewMode === 'map' ? (
            <div>
              <div style={{ height: 500, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {filteredMembers.filter(m => m.latitude && m.longitude).map(m => (
                    <Marker key={m.id} position={[m.latitude!, m.longitude!]}>
                      <Popup>
                        <strong>{m.name || 'Anonymous'}</strong>
                        <br />
                        {m.location && <span>📍 {m.location}</span>}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              {filteredMembers.filter(m => !m.latitude || !m.longitude).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-secondary)' }}>Global / Not location specific</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredMembers.filter(m => !m.latitude || !m.longitude).map(m => (
                      <Link key={m.id} href={getUserProfileUrl(m)} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                        <strong>{m.name || 'Anonymous'}</strong>
                        {m.location && <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {m.location}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className={viewMode === 'list' ? styles.membersList : styles.membersGrid}>
            {filteredMembers.map((member) => {
              const isConnected = connections.some(
                (c: Connection) => (c.receiverId === member.id || c.requesterId === member.id)
              )
              const hasPending = pendingRequests.some(
                (c: Connection) => c.requesterId === member.id && c.receiverId === session?.user?.id
              )
              
              return (
                <div key={member.id} className={styles.memberCard}>
                  <div className={styles.memberAvatar}>
                    {member.image ? (
                      <img src={member.image} alt={member.name || 'Member'} />
                    ) : (
                      <span>{member.name?.[0] || member.email[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.memberInfo}>
                    <h3>
                      {member.name || 'Anonymous User'}
                      <RoleBadge role={member.role || 'USER'} />
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <ActiveStatus lastActiveAt={member.lastActiveAt} showLabel size={8} />
                      {member.lookingForCollaborators && <LookingForCollaboratorsBadge />}
                    </div>
                    {member.userClass && (
                      <div className={styles.classBadges}>
                        {member.userClass.split(',').map(c => c.trim()).filter(Boolean).map(cls => (
                          <span key={cls} className={styles.classBadge}>
                            <span className={styles.classIcon}>{CLASS_ICONS[cls] || '👤'}</span>
                            {cls}
                          </span>
                        ))}
                      </div>
                    )}
                    {member.location && (
                      <p className={styles.memberLocation}>
                        <span>📍</span> {member.location}
                      </p>
                    )}
                    {member.bio && <p className={styles.memberBio}>{member.bio.slice(0, 80)}{member.bio.length > 80 ? '...' : ''}</p>}
                    <div className={styles.memberStats}>
                      {(member.planCount ?? 0) > 0 && <span title="Projects">🚀 {member.planCount}</span>}
                      {(member.requestCount ?? 0) > 0 && <span title="Requests">📝 {member.requestCount}</span>}
                      {(member.productCount ?? 0) > 0 && <span title="Items">🛒 {member.productCount}</span>}
                      {(member.postCount ?? 0) > 0 && <span title="Posts">💬 {member.postCount}</span>}
                      {(member.connectionCount ?? 0) > 0 && <span title="Connections">🤝 {member.connectionCount}</span>}
                    </div>
                    <p className={styles.memberDate}>
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={styles.memberActions}>
                    <Link href={getUserProfileUrl(member)} className={styles.viewProfile}>
                      View Profile
                    </Link>
                    {member.id !== session?.user?.id && (
                      <Button 
                        variant="secondary"
                        className={`${styles.connectBtn} ${isConnected ? styles.connected : ''}`}
                        onClick={() => handleConnect(member.id)}
                        disabled={isConnected || hasPending}
                      >
                        {isConnected ? 'Connected' : hasPending ? 'Pending' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          )}
          {filteredMembers.length === 0 && (
            <EmptyState icon="👥" title="No members found" description="No members found matching your search." />
          )}
        </div>
      )}

      {activeTab === 'connections' && (
        <div className={styles.connectionsSection}>
          {connections.length > 0 ? (
            <div className={styles.membersGrid}>
              {connections.map((connection: Connection) => {
                const connectedMember = connection.receiverId === session?.user?.id 
                  ? connection.requester 
                  : connection.receiver
                
                if (!connectedMember) return null
                
                return (
                  <div key={connection.id} className={styles.memberCard}>
                    <div className={styles.memberAvatar}>
                      {connectedMember.image ? (
                        <img src={connectedMember.image} alt={connectedMember.name || 'Member'} />
                      ) : (
                        <span>{connectedMember.name?.[0] || connectedMember.email[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.memberInfo}>
                      <h3>{connectedMember.name || 'Anonymous User'}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <ActiveStatus lastActiveAt={connectedMember.lastActiveAt} showLabel size={8} />
                        {connectedMember.lookingForCollaborators && <LookingForCollaboratorsBadge />}
                      </div>
                      {connectedMember.location && (
                        <p className={styles.memberLocation}>
                          <span>📍</span> {connectedMember.location}
                        </p>
                      )}
                    </div>
                    <div className={styles.memberActions}>
                      <Link href={`/messages?user=${connectedMember.id}`} className={styles.messageBtn}>
                        Message
                      </Link>
                      <Link href={getUserProfileUrl(connectedMember)} className={styles.viewProfile}>
                        View Profile
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="👥" title="No connections yet" description="You haven't connected with anyone yet." />
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className={styles.requestsSection}>
          {pendingRequests.length > 0 ? (
            <div className={styles.requestsList}>
              {pendingRequests.map((request) => (
                <div key={request.id} className={styles.requestCard}>
                  <div className={styles.memberAvatar}>
                    {request.requester?.image ? (
                      <img src={request.requester.image} alt={request.requester.name || 'User'} />
                    ) : (
                      <span>{request.requester?.name?.[0] || '?'}</span>
                    )}
                  </div>
                  <div className={styles.requestInfo}>
                    <h4>{request.requester?.name || 'Anonymous User'}</h4>
                    <p>wants to connect with you</p>
                  </div>
                  <div className={styles.requestActions}>
                    <Button 
                      variant="primary"
                      className={styles.acceptBtn}
                      onClick={() => handleAcceptConnection(request.id)}
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="ghost"
                      className={styles.declineBtn}
                      onClick={() => {
                        fetch(`/api/community/connections/${request.id}`, { method: 'DELETE' })
                          .then(() => fetchData())
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="👥" title="No pending requests" description="No pending connection requests." />
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className={styles.groupsSection}>
          <div className={styles.groupsGrid}>
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
                <div className={styles.groupIcon}>
                  {group.imageUrl ? (
                    <img src={group.imageUrl} alt={group.name} />
                  ) : (
                    <span>👥</span>
                  )}
                </div>
                <div className={styles.groupInfo}>
                  <h4>{group.name}</h4>
                  {group.description && (
                    <p className={styles.groupDesc}>{group.description}</p>
                  )}
                  <p className={styles.groupMeta}>
                    <span>👥 {group._count.members} members</span>
                    <span>📝 {group._count.posts} posts</span>
                    {group.isPrivate && <span>🔒 Private</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          
          {groups.length === 0 && (
            <EmptyState icon="👥" title="No groups yet" description="No groups available yet." />
          )}
        </div>
      )}

      {activeTab === 'marketRequests' && (
        <div className={styles.membersSection}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.membersGrid}>
            {filteredRequests.map((req) => (
              <Link key={req.id} href={`/requests/${req.id}`} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <h4>{req.title}</h4>
                  {req.description && (
                    <p className={styles.memberBio}>{req.description.slice(0, 100)}{req.description.length > 100 ? '...' : ''}</p>
                  )}
                  <p className={styles.memberMeta}>
                    <span>by {req.user.name || 'Anonymous'}</span>
                    {req.budget && <span>Budget: ${req.budget}</span>}
                    {req.location && <span>📍 {req.location}</span>}
                  </p>
                </div>
                <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
              </Link>
            ))}
          </div>
          
          {filteredRequests.length === 0 && (
            <EmptyState icon="📦" title="No requests found" description="No requests found." />
          )}
        </div>
      )}

      {activeTab === 'forum' && (
        <div className={styles.forumSection}>
          <div className={styles.forumHeader}>
            <h2>Forum Discussions</h2>
            <Button variant="primary" className={styles.createPostBtn} onClick={() => setShowNewPost(true)}>
              + New Post
            </Button>
          </div>

          <div className={styles.forumCategories}>
            <Button
              variant="secondary"
              className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
              onClick={() => { setSelectedCategory(null); fetchForumPosts(); }}
            >
              <span>📋</span>
              <span>All Topics</span>
            </Button>
            {forumCategories.map(cat => (
              <Button
                key={cat.id}
                variant="secondary"
                className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.active : ''}`}
                onClick={() => { setSelectedCategory(cat.id); fetchForumPosts(cat.id); }}
              >
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className={styles.categoryCount}>{cat._count?.posts || 0}</span>
              </Button>
            ))}
          </div>

          {showNewPost && (
            <div className={styles.newPostForm}>
              <h3>Create New Post</h3>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.categorySelect}
              >
                <option value="">Select Category</option>
                {forumCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Post title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className={styles.postTitleInput}
              />
              <textarea
                placeholder="Write your post content..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className={styles.postContentInput}
                rows={4}
              />
              <div className={styles.postFormActions}>
                <Button variant="primary" onClick={handleCreatePost} className={styles.submitPostBtn}>Post</Button>
                <Button variant="ghost" onClick={() => setShowNewPost(false)} className={styles.cancelPostBtn}>Cancel</Button>
              </div>
            </div>
          )}

          <div className={styles.postsList}>
            {forumPosts.map(post => (
              <Link key={post.id} href={`/community/forum/${post.id}`} className={styles.postCardLink}>
                <div className={styles.postHeader}>
                  <span className={styles.postCategory}>{post.category?.name}</span>
                  <span className={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postContent}>{post.content.slice(0, 200)}{post.content.length > 200 ? '...' : ''}</p>
                <div className={styles.postFooter}>
                  <span className={styles.postAuthor}>by {post.author?.name || 'Anonymous'}</span>
                  {post.totalTips > 0 && (
                    <span className={styles.postTips}>💰 ${post.totalTips.toFixed(2)}</span>
                  )}
                  {post.viewCount > 0 && <span className={styles.postViews}>👁️ {post.viewCount}</span>}
                  {post.replyCount > 0 && <span className={styles.postReplies}>💬 {post.replyCount}</span>}
                </div>
              </Link>
            ))}
            {forumPosts.length === 0 && (
              <EmptyState icon="💬" title="No posts yet" description="Be the first to post!" />
            )}
          </div>

          {tipTarget && (
            <div className={styles.tipModal}>
              <div className={styles.tipModalContent}>
                <h3>Send Tip</h3>
                
                <div className={styles.cryptoSelect}>
                  <label>Select Crypto</label>
                  <div className={styles.cryptoGrid}>
                    {cryptoBalances.map(crypto => (
                      <Button
                        key={crypto.symbol}
                        variant="secondary"
                        className={`${styles.cryptoBtn} ${tipCrypto === crypto.symbol ? styles.selected : ''}`}
                        onClick={() => setTipCrypto(crypto.symbol)}
                        style={{ '--crypto-color': crypto.color } as React.CSSProperties}
                      >
                        <img src={crypto.icon} alt={crypto.symbol} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                        <span>{crypto.symbol}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className={styles.balanceInfo}>
                  <span>Available: {cryptoBalances.find(c => c.symbol === tipCrypto)?.available?.toFixed(4) || '0'} {tipCrypto}</span>
                </div>

                <input
                  type="number"
                  placeholder={`Amount (${tipCrypto})`}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className={styles.tipInput}
                  min="0.01"
                  step="0.01"
                />
                <div className={styles.tipActions}>
                  <Button variant="primary" onClick={() => handleTip(tipTarget.type, tipTarget.id, tipTarget.authorId)} className={styles.confirmTipBtn}>
                    Confirm Tip
                  </Button>
                  <Button variant="ghost" onClick={() => { setTipTarget(null); setTipAmount(''); }} className={styles.cancelTipBtn}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
