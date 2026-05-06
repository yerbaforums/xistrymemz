'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; image: string | null; email: string; username: string | null }
}

interface GroupPost {
  id: string
  content: string
  imageUrl: string | null
  pinned: boolean
  likes: number
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface GroupBuy {
  id: string
  title: string
  description: string | null
  targetPrice: number
  currentPrice: number
  minSupporters: number
  currentSupporters: number
  status: string
  productUrl: string | null
  productImage: string | null
  organizer: { id: string; name: string | null; image: string | null }
  completedAt: string | null
  createdAt: string
  _count: { supporters: number }
}

interface GroupRequest {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  budget: number | null
  goalAmount: number | null
  currentFunding: number
  isPublic: boolean
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
  _count: { comments: number; fulfillments: number }
}

interface MarketplaceProduct {
  id: string
  title: string
  description: string | null
  price: number | null
  type: string
  category: string | null
  condition: string | null
  imageUrl: string | null
  published: boolean
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface ActivityItem {
  id: string
  title: string
  description: string | null
  status?: string
  type?: string
  category?: string | null
  location?: string | null
  imageUrl?: string | null
  price?: number
  eventDate?: string | null
  joinerCount?: number
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface Activity {
  projects: ActivityItem[]
  requests: ActivityItem[]
  products: ActivityItem[]
  events: ActivityItem[]
}

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  coverImage: string | null
  bannerColor: string | null
  isPrivate: boolean
  user: { id: string; name: string | null; image: string | null }
  members: Member[]
  posts: GroupPost[]
  groupBuys: GroupBuy[]
  requests: GroupRequest[]
  marketplaceProducts: MarketplaceProduct[]
  _count: { members: number; posts: number }
  isMember: boolean
  isAdmin: boolean
}

function GroupDetailContent() {
  const { data: session } = useSession()
  const params = useParams()
  const { success, error, warning } = useToast()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postImage, setPostImage] = useState('')
  const [posting, setPosting] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'buys' | 'requests' | 'marketplace' | 'activity'>('posts')
  const [activity, setActivity] = useState<Activity>({ projects: [], requests: [], products: [], events: [] })
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', imageUrl: '', coverImage: '', isPrivate: false })
  const [saving, setSaving] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyForm, setBuyForm] = useState({ title: '', description: '', targetPrice: '', minSupporters: '5', productUrl: '', productImage: '', linkedProductId: '' })
  const [creatingBuy, setCreatingBuy] = useState(false)
  const [supportingBuyId, setSupportingBuyId] = useState<string | null>(null)
  const [selectedBuy, setSelectedBuy] = useState<GroupBuy | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ title: '', description: '', category: 'FUNDING', priority: 'MEDIUM', budget: '', goalAmount: '', isPublic: true })
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false)
  const [marketplaceSearch, setMarketplaceSearch] = useState('')
  const [marketplaceResults, setMarketplaceResults] = useState<MarketplaceProduct[]>([])
  const [linkingProduct, setLinkingProduct] = useState(false)
  const [selectedBuySupporters, setSelectedBuySupporters] = useState<null | Array<{ id: string; user: { id: string; name: string | null; image: string | null; username: string | null }; createdAt: string }>>(null)
  const [loadingSupporters, setLoadingSupporters] = useState(false)

  useEffect(() => {
    fetch(`/api/groups/${params.id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setGroup(data)
        setEditForm({
          name: data.name || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          coverImage: data.coverImage || '',
          isPrivate: data.isPrivate || false
        })
      })
      .catch(() => error('Failed to load group'))
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'activity' && group?.isMember) {
      setLoadingActivity(true)
      fetch(`/api/groups/${params.id}/members-activity`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setActivity(data))
        .catch(() => {})
        .finally(() => setLoadingActivity(false))
    }
  }, [activeTab, group?.isMember, params.id])

  const refreshGroup = () => fetch(`/api/groups/${params.id}`).then(r => r.json()).then(data => setGroup(data))

  const handleJoin = async () => {
    if (!session?.user?.id) {
      warning('Please log in to join this group')
      return
    }
    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/join`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setGroup(g => g ? { ...g, isMember: true, members: [...g.members, data], _count: { ...g._count, members: g._count.members + 1 } } : g)
        success('Joined group!')
      } else {
        error(data.error)
      }
    } catch {
      error('Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!session?.user?.id) return
    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/join`, { method: 'DELETE' })
      if (res.ok) {
        setGroup(g => g ? { ...g, isMember: false, members: g.members.filter(m => m.user.id !== session.user?.id), _count: { ...g._count, members: Math.max(0, g._count.members - 1) } } : g)
        success('Left group')
      }
    } catch {
      error('Failed to leave group')
    } finally {
      setJoining(false)
    }
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postContent.trim() || !group?.isMember) return
    setPosting(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent, imageUrl: postImage || null })
      })
      if (res.ok) {
        const newPost = await res.json()
        setGroup(g => g ? { ...g, posts: [newPost, ...g.posts], _count: { ...g._count, posts: g._count.posts + 1 } } : g)
        setPostContent('')
        setPostImage('')
      }
    } catch {
      error('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const handleLikePost = async (postId: string, currentLikes: number) => {
    const isLiked = likedPosts.has(postId)
    const newCount = isLiked ? currentLikes - 1 : currentLikes + 1
    setLikedPosts(prev => { const next = new Set(prev); isLiked ? next.delete(postId) : next.add(postId); return next })
    setGroup(g => g ? { ...g, posts: g.posts.map(p => p.id === postId ? { ...p, likes: newCount } : p) } : g)
    try {
      await fetch(`/api/groups/${params.id}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !isLiked })
      })
    } catch { /* best effort */ }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try {
      const res = await fetch(`/api/groups/${params.id}/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        setGroup(g => g ? { ...g, posts: g.posts.filter(p => p.id !== postId), _count: { ...g._count, posts: Math.max(0, g._count.posts - 1) } } : g)
        success('Post deleted')
      }
    } catch {
      error('Failed to delete post')
    }
  }

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/groups/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        const data = await res.json()
        setGroup(g => g ? { ...g, ...data } : g)
        setShowEditModal(false)
        success('Group updated!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update')
      }
    } catch {
      error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateBuy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyForm.title || !buyForm.targetPrice || !buyForm.minSupporters) return
    setCreatingBuy(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/group-buys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buyForm,
          targetPrice: parseFloat(buyForm.targetPrice),
          minSupporters: parseInt(buyForm.minSupporters),
          linkedProductId: buyForm.linkedProductId || null
        })
      })
      if (res.ok) {
        const newBuy = await res.json()
        setGroup(g => g ? { ...g, groupBuys: [newBuy, ...(g.groupBuys || [])] } : g)
        setShowBuyModal(false)
        setBuyForm({ title: '', description: '', targetPrice: '', minSupporters: '5', productUrl: '', productImage: '', linkedProductId: '' })
        success('Group buy created!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create group buy')
    } finally {
      setCreatingBuy(false)
    }
  }

  const handleSupportBuy = async (buyId: string) => {
    if (!session?.user?.id) {
      warning('Log in to support group buys')
      return
    }
    setSupportingBuyId(buyId)
    try {
      const res = await fetch(`/api/group-buys/${buyId}/support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 1 }) })
      if (res.ok) {
        if (group) {
          fetch(`/api/groups/${params.id}/group-buys`)
            .then(r => r.json())
            .then(buys => setGroup(g => g ? { ...g, groupBuys: buys } : g))
        }
        success('You joined this group buy!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to support')
      }
    } catch {
      error('Failed to support')
    } finally {
      setSupportingBuyId(null)
    }
  }

  const handleViewSupporters = async (buyId: string) => {
    setLoadingSupporters(true)
    setSelectedBuySupporters(null)
    try {
      const res = await fetch(`/api/group-buys/${buyId}/support`)
      if (res.ok) {
        const data = await res.json()
        setSelectedBuySupporters(data.supporters)
      }
    } catch {
      error('Failed to load supporters')
    } finally {
      setLoadingSupporters(false)
    }
  }

  const handleDeleteBuy = async (buyId: string) => {
    if (!confirm('Delete this group buy?')) return
    try {
      const res = await fetch(`/api/group-buys/${buyId}`, { method: 'DELETE' })
      if (res.ok) {
        setGroup(g => g ? { ...g, groupBuys: g.groupBuys.filter(b => b.id !== buyId) } : g)
        success('Group buy deleted')
      }
    } catch {
      error('Failed to delete')
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestForm.title.trim()) return
    setCreatingRequest(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestForm,
          groupId: params.id,
          budget: requestForm.budget ? parseFloat(requestForm.budget) : null,
          goalAmount: requestForm.goalAmount ? parseFloat(requestForm.goalAmount) : null
        })
      })
      if (res.ok) {
        const newReq = await res.json()
        setGroup(g => g ? { ...g, requests: [newReq, ...(g.requests || [])] } : g)
        setShowRequestModal(false)
        setRequestForm({ title: '', description: '', category: 'FUNDING', priority: 'MEDIUM', budget: '', goalAmount: '', isPublic: true })
        success('Request created!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create request')
      }
    } catch {
      error('Failed to create request')
    } finally {
      setCreatingRequest(false)
    }
  }

  const handleDeleteRequest = async (reqId: string) => {
    if (!confirm('Delete this request?')) return
    try {
      const res = await fetch(`/api/requests/${reqId}`, { method: 'DELETE' })
      if (res.ok) {
        setGroup(g => g ? { ...g, requests: (g.requests || []).filter(r => r.id !== reqId) } : g)
        success('Request deleted')
      }
    } catch {
      error('Failed to delete request')
    }
  }

  const searchMarketplace = async () => {
    if (!marketplaceSearch.trim()) {
      setMarketplaceResults([])
      return
    }
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(marketplaceSearch)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setMarketplaceResults(data.slice(0, 10))
      }
    } catch {
      error('Failed to search marketplace')
    }
  }

  const handleLinkProduct = async (product: MarketplaceProduct) => {
    if (!group?.isMember) return
    setLinkingProduct(true)
    try {
      const res = await fetch(`/api/groups/${params.id}/marketplace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      })
      if (res.ok) {
        const updatedProduct = await res.json()
        setGroup(g => g ? { ...g, marketplaceProducts: [updatedProduct, ...(g.marketplaceProducts || [])] } : g)
        setShowMarketplaceModal(false)
        setMarketplaceResults([])
        setMarketplaceSearch('')
        success('Product linked!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to link product')
      }
    } catch {
      error('Failed to link product')
    } finally {
      setLinkingProduct(false)
    }
  }

  const handleUnlinkProduct = async (productId: string) => {
    if (!confirm('Unlink this product?')) return
    try {
      const res = await fetch(`/api/groups/${params.id}/marketplace/${productId}`, { method: 'DELETE' })
      if (res.ok) {
        setGroup(g => g ? { ...g, marketplaceProducts: (g.marketplaceProducts || []).filter(p => p.id !== productId) } : g)
        success('Product unlinked')
      }
    } catch {
      error('Failed to unlink product')
    }
  }

  const handleDeleteGroup = async () => {
    if (!confirm('Delete this entire group? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/groups/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Group deleted')
        window.location.href = '/groups'
      } else {
        const err = await res.json()
        error(err.error || 'Failed to delete')
      }
    } catch {
      error('Failed to delete')
    }
  }

  const handlePin = async (type: string, id: string, currentPinned: boolean) => {
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, pinned: !currentPinned })
      })
      if (res.ok) {
        refreshGroup()
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!group) return <div className={styles.error}>Group not found</div>

  const postProgress = (buy: GroupBuy) => {
    const supporterPct = Math.min((buy.currentSupporters / buy.minSupporters) * 100, 100)
    const pricePct = Math.min((buy.currentPrice / buy.targetPrice) * 100, 100)
    return Math.max(supporterPct, pricePct)
  }

  const isBuyComplete = (buy: GroupBuy) => buy.currentSupporters >= buy.minSupporters && buy.currentPrice >= buy.targetPrice

  const myUserId = session?.user?.id || null
  const isPostOwner = (post: GroupPost) => myUserId === post.user.id
  const isBuyOwner = (buy: GroupBuy) => myUserId === buy.organizer.id
  const isReqOwner = (req: GroupRequest) => myUserId === req.user.id

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Groups', href: '/groups' },
        { label: group.name }
      ]} />

      <div className={styles.groupHeader}>
        <div
          className={styles.coverImage}
          style={{
            backgroundImage: group.coverImage ? `url(${group.coverImage})` : undefined,
            background: group.coverImage ? undefined : (group.bannerColor || 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)')
          }}
        >
          {!group.coverImage && <div className={styles.coverOverlay} />}
        </div>
        <div className={styles.headerContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {group.imageUrl ? <img src={group.imageUrl} alt={group.name} /> : <span>👥</span>}
            </div>
          </div>
          <div className={styles.groupInfo}>
            <div className={styles.nameRow}>
              <h1>{group.name}</h1>
              {group.isPrivate && <span className={styles.privateBadge}>🔒 Private</span>}
            </div>
            {group.description && <p className={styles.description}>{group.description}</p>}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{group._count.members}</span>
                <span className={styles.statLabel}>Members</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{group._count.posts}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{group.groupBuys?.filter(b => b.status === 'ACTIVE').length || 0}</span>
                <span className={styles.statLabel}>Active Buys</span>
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            {myUserId && (
              group.isMember ? (
                <button onClick={handleLeave} disabled={joining} className={styles.leaveBtn}>Leave</button>
              ) : (
                <button onClick={handleJoin} disabled={joining} className={styles.joinBtn}>{joining ? 'Joining...' : 'Join Group'}</button>
              )
            )}
            {group.isAdmin && (
              <>
                <button onClick={() => setShowEditModal(true)} className={styles.editBtn}>Edit</button>
                <button onClick={handleDeleteGroup} className={styles.deleteBtn}>Delete</button>
              </>
            )}
          </div>
        </div>
      </div>

      {group.isMember && (
        <>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`} onClick={() => setActiveTab('posts')}>
              💬 Posts ({group._count.posts})
            </button>
            <button className={`${styles.tab} ${activeTab === 'buys' ? styles.active : ''}`} onClick={() => setActiveTab('buys')}>
              🛍️ Group Buys
            </button>
            <button className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`} onClick={() => setActiveTab('requests')}>
              📝 Requests
            </button>
            <button className={`${styles.tab} ${activeTab === 'marketplace' ? styles.active : ''}`} onClick={() => setActiveTab('marketplace')}>
              🏪 Marketplace
            </button>
            <button className={`${styles.tab} ${activeTab === 'activity' ? styles.active : ''}`} onClick={() => setActiveTab('activity')}>
              🚀 Activity
            </button>
          </div>

          <div className={styles.content}>
            <div className={styles.mainSection}>
              {activeTab === 'posts' && (
                <>
                  <div className={styles.postForm}>
                    <form onSubmit={handlePost}>
                      <textarea
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        placeholder="Share something with the group..."
                        rows={3}
                      />
                      <div className={styles.postFormRow}>
                        <input
                          type="url"
                          value={postImage}
                          onChange={e => setPostImage(e.target.value)}
                          placeholder="Image URL (optional)"
                          className={styles.imageInput}
                        />
                        <button type="submit" disabled={posting || !postContent.trim()} className="btn-primary">
                          {posting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={styles.postsList}>
                    {group.posts.length === 0 ? (
                      <div className={styles.empty}><p>No posts yet. Be the first!</p></div>
                    ) : (
                      group.posts.map(post => (
                        <div key={post.id} className={`${styles.postCard} ${post.pinned ? styles.pinnedCard : ''}`}>
                          <div className={styles.postHeader}>
                            <div className={styles.postAuthor}>
                              <Link href={getUserProfileUrl(post.user)} className={styles.authorAvatar}>
                                {post.user.image ? <img src={post.user.image} alt="" /> : <span>{(post.user.name?.[0] || 'U').toUpperCase()}</span>}
                              </Link>
                              <div>
                                <Link href={getUserProfileUrl(post.user)} className={styles.authorName}>{post.user.name || 'Unknown'}</Link>
                                <span className={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {isPostOwner(post) && (
                                <button
                                  onClick={() => handlePin('groupPost', post.id, post.pinned)}
                                  className={`${styles.pinBtn} ${post.pinned ? styles.pinBtnActive : ''}`}
                                  title={post.pinned ? 'Unpin' : 'Pin to top'}
                                >
                                  {post.pinned ? '📌' : '📍'}
                                </button>
                              )}
                              {isPostOwner(post) && (
                                <button onClick={() => handleDeletePost(post.id)} className={styles.deletePostBtn} title="Delete">×</button>
                              )}
                            </div>
                          </div>
                          <p className={styles.postContent}>{post.content}</p>
                          {post.imageUrl && (
                            <div className={styles.postImage}>
                              <img src={post.imageUrl} alt="Post attachment" />
                            </div>
                          )}
                          <div className={styles.postFooter}>
                            <button onClick={() => handleLikePost(post.id, post.likes)} className={styles.likeBtn}>
                              ♥ {post.likes}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {activeTab === 'buys' && (
                <div className={styles.buysSection}>
                  {group.isMember && (
                    <div className={styles.buysActions}>
                      <button onClick={() => setShowBuyModal(true)} className={styles.createBuyBtn}>+ Create Group Buy</button>
                    </div>
                  )}

                  {selectedBuySupporters && (
                    <div className={styles.supportersModal}>
                      <div className={styles.supportersHeader}>
                        <h3>Supporters</h3>
                        <button onClick={() => setSelectedBuySupporters(null)} className={styles.closeBtn}>×</button>
                      </div>
                      {loadingSupporters ? (
                        <p className={styles.loadingSmall}>Loading supporters...</p>
                      ) : selectedBuySupporters.length === 0 ? (
                        <p className={styles.emptySmall}>No supporters yet</p>
                      ) : (
                        <div className={styles.supportersList}>
                          {selectedBuySupporters.map(s => (
                            <div key={s.id} className={styles.supporterItem}>
                              <Link href={getUserProfileUrl(s.user)} className={styles.supporterAvatar}>
                                {s.user.image ? <img src={s.user.image} alt="" /> : <span>{(s.user.name?.[0] || 'U').toUpperCase()}</span>}
                              </Link>
                              <div className={styles.supporterInfo}>
                                <span>{s.user.name || 'Unknown'}</span>
                                <span className={styles.supporterDate}>{new Date(s.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedBuy && !selectedBuySupporters && (
                    <div className={styles.buyDetail}>
                      <button onClick={() => setSelectedBuy(null)} className={styles.backBtn}>← Back to buys</button>
                      <h2>{selectedBuy.title}</h2>
                      {selectedBuy.description && <p className={styles.buyDescription}>{selectedBuy.description}</p>}
                      {selectedBuy.productImage && (
                        <div className={styles.buyProductImage}><img src={selectedBuy.productImage} alt="" /></div>
                      )}
                      <div className={styles.buyStats}>
                        <div className={styles.buyStatItem}>
                          <span className={styles.buyStatLabel}>Target</span>
                          <span className={styles.buyStatValue}>${selectedBuy.targetPrice}</span>
                        </div>
                        <div className={styles.buyStatItem}>
                          <span className={styles.buyStatLabel}>Current</span>
                          <span className={styles.buyStatValue}>${selectedBuy.currentPrice}</span>
                        </div>
                        <div className={styles.buyStatItem}>
                          <span className={styles.buyStatLabel}>Supporters</span>
                          <span className={styles.buyStatValue}>{selectedBuy.currentSupporters}/{selectedBuy.minSupporters}</span>
                        </div>
                      </div>
                      <div className={styles.buyProgress}>
                        <div className={styles.buyProgressBar} style={{ width: `${postProgress(selectedBuy)}%` }} />
                      </div>
                      <span className={`${styles.buyStatus} ${styles[selectedBuy.status.toLowerCase()]}`}>{selectedBuy.status}</span>
                      {selectedBuy.productUrl && (
                        <a href={selectedBuy.productUrl} target="_blank" rel="noopener noreferrer" className={styles.productLink}>
                          View Product →
                        </a>
                      )}
                      {selectedBuy.currentSupporters > 0 && (
                        <button className={styles.viewSupportersBtn} onClick={() => handleViewSupporters(selectedBuy.id)}>
                          View {selectedBuy.currentSupporters} supporter{selectedBuy.currentSupporters > 1 ? 's' : ''}
                        </button>
                      )}
                      <p className={styles.buyOrganizer}>
                        Organized by <Link href={getUserProfileUrl(selectedBuy.organizer)}>{selectedBuy.organizer.name || 'Unknown'}</Link>
                      </p>
                    </div>
                  )}

                  {!selectedBuy && !selectedBuySupporters && (
                    <div className={styles.buysGrid}>
                      {group.groupBuys && group.groupBuys.length > 0 ? (
                        group.groupBuys.map(buy => (
                          <div key={buy.id} className={`${styles.buyCard} ${buy.status === 'COMPLETED' ? styles.buyCompleted : ''}`}>
                            <div className={styles.buyCardHeader}>
                              <h3 onClick={() => setSelectedBuy(buy)} className={styles.buyTitle}>{buy.title}</h3>
                              {isBuyOwner(buy) && (
                                <button onClick={() => handleDeleteBuy(buy.id)} className={styles.deleteBuyBtn} title="Delete">×</button>
                              )}
                            </div>
                            {buy.description && <p className={styles.buyCardDesc}>{buy.description.slice(0, 100)}...</p>}
                            {buy.productImage && (
                              <div className={styles.buyCardImage}><img src={buy.productImage} alt="" /></div>
                            )}
                            <div className={styles.buyCardStats}>
                              <span>${buy.currentPrice} / ${buy.targetPrice}</span>
                              <span>{buy.currentSupporters}/{buy.minSupporters} supporters</span>
                            </div>
                            <div className={styles.buyProgress}>
                              <div className={styles.buyProgressBar} style={{ width: `${postProgress(buy)}%` }} />
                            </div>
                            <div className={styles.buyCardActions}>
                              <span className={`${styles.buyStatus} ${styles[buy.status.toLowerCase()]}`}>{buy.status}</span>
                              {buy.status === 'ACTIVE' && group.isMember && (
                                <button
                                  onClick={() => handleSupportBuy(buy.id)}
                                  disabled={supportingBuyId === buy.id}
                                  className={styles.supportBtn}
                                >
                                  {supportingBuyId === buy.id ? '...' : 'Support'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.empty}><p>No group buys yet. Create one to pool resources!</p></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className={styles.requestsSection}>
                  <div className={styles.requestsActions}>
                    <button onClick={() => setShowRequestModal(true)} className={styles.createRequestBtn}>+ Create Request</button>
                    <Link href={`/requests?groupId=${params.id}`} className={styles.viewAllRequestsBtn}>View All Requests</Link>
                  </div>

                  {group.requests && group.requests.length > 0 ? (
                    <div className={styles.requestsList}>
                      {group.requests.map(req => (
                        <div key={req.id} className={styles.requestCard}>
                          <div className={styles.requestCardHeader}>
                            <Link href={`/requests/${req.id}`} className={styles.requestCardTitle}>{req.title}</Link>
                            <div className={styles.requestCardActions}>
                              <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                              <span className={`badge badge-${req.priority.toLowerCase()}`}>{req.priority}</span>
                              {isReqOwner(req) && (
                                <button onClick={() => handleDeleteRequest(req.id)} className={styles.deleteSmallBtn} title="Delete">×</button>
                              )}
                            </div>
                          </div>
                          {req.description && <p className={styles.requestCardDesc}>{req.description.slice(0, 150)}...</p>}
                          <div className={styles.requestCardMeta}>
                            <span>{req.category}</span>
                            {req.goalAmount && <span>Goal: ${req.goalAmount}</span>}
                            {req.currentFunding > 0 && <span>Funded: ${req.currentFunding}</span>}
                            <span>💬 {req._count.comments}</span>
                            <span>✓ {req._count.fulfillments}</span>
                            <span className={styles.requestDate}>{new Date(req.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}><p>No requests yet. Create one to ask the group for help!</p></div>
                  )}
                </div>
              )}

              {activeTab === 'marketplace' && (
                <div className={styles.marketplaceSection}>
                  <div className={styles.marketplaceActions}>
                    <button onClick={() => setShowMarketplaceModal(true)} className={styles.linkProductBtn}>+ Link Marketplace Product</button>
                  </div>

                  {group.marketplaceProducts && group.marketplaceProducts.length > 0 ? (
                    <div className={styles.marketplaceGrid}>
                      {group.marketplaceProducts.map(product => (
                        <Link key={product.id} href={`/products/${product.id}`} className={styles.marketplaceCard}>
                          <div className={styles.marketplaceImage}>
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.title} />
                            ) : (
                              <div className={styles.marketplacePlaceholder}>📦</div>
                            )}
                          </div>
                          <div className={styles.marketplaceInfo}>
                            <h3>{product.title}</h3>
                            {product.price && <span className={styles.marketplacePrice}>${product.price}</span>}
                            <div className={styles.marketplaceTags}>
                              <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                              {product.condition && <span className={styles.marketplaceCondition}>{product.condition.replace('_', ' ')}</span>}
                            </div>
                          </div>
                          <div className={styles.marketplaceActions}>
                            {group.isAdmin && (
                              <button onClick={(e) => { e.preventDefault(); handleUnlinkProduct(product.id); }} className={styles.unlinkBtn}>Unlink</button>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}><p>No marketplace products linked yet. Link products relevant to this group!</p></div>
                  )}
                </div>
              )}

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
                      {Object.values(activity).every(arr => arr.length === 0) && (
                        <div className={styles.empty}><p>No member activity yet.</p></div>
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
                    <Link href={getUserProfileUrl(member.user)} key={member.id} className={styles.memberItem}>
                      {member.user.image ? (
                        <img src={member.user.image} alt="" />
                      ) : (
                        <div className={styles.memberPlaceholder}>{(member.user.name?.[0] || 'U').toUpperCase()}</div>
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
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Group</h2>
            <form onSubmit={handleSaveGroup}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
              </div>
              <div className="form-group">
                <label>Group Image URL</label>
                <input type="url" value={editForm.imageUrl} onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Cover Image URL</label>
                <input type="url" value={editForm.coverImage} onChange={e => setEditForm({ ...editForm, coverImage: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={editForm.isPrivate} onChange={e => setEditForm({ ...editForm, isPrivate: e.target.checked })} />
                  Private Group
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Buy Modal */}
      {showBuyModal && (
        <div className="modal-overlay" onClick={() => setShowBuyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Group Buy</h2>
            <p className={styles.buyModalDesc}>Pool resources with group members to get a better deal on a product or service.</p>
            <form onSubmit={handleCreateBuy}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={buyForm.title} onChange={e => setBuyForm({ ...buyForm, title: e.target.value })} placeholder="e.g., Bulk Order: Organic Coffee" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={buyForm.description} onChange={e => setBuyForm({ ...buyForm, description: e.target.value })} rows={3} placeholder="What are we buying together?" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Price ($) *</label>
                  <input type="number" value={buyForm.targetPrice} onChange={e => setBuyForm({ ...buyForm, targetPrice: e.target.value })} placeholder="100" step="0.01" min="1" required />
                </div>
                <div className="form-group">
                  <label>Min Supporters *</label>
                  <input type="number" value={buyForm.minSupporters} onChange={e => setBuyForm({ ...buyForm, minSupporters: e.target.value })} placeholder="5" min="2" required />
                </div>
              </div>
              <div className="form-group">
                <label>Product URL (external)</label>
                <input type="url" value={buyForm.productUrl} onChange={e => setBuyForm({ ...buyForm, productUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Product Image URL</label>
                <input type="url" value={buyForm.productImage} onChange={e => setBuyForm({ ...buyForm, productImage: e.target.value })} placeholder="https://..." />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" disabled={creatingBuy}>{creatingBuy ? 'Creating...' : 'Create Group Buy'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowBuyModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Request</h2>
            <p className={styles.buyModalDesc}>Ask the group for help, funding, or collaboration on a project or need.</p>
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={requestForm.title} onChange={e => setRequestForm({ ...requestForm, title: e.target.value })} placeholder="e.g., Need funding for community garden" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={requestForm.description} onChange={e => setRequestForm({ ...requestForm, description: e.target.value })} rows={3} placeholder="Describe what you need..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={requestForm.category} onChange={e => setRequestForm({ ...requestForm, category: e.target.value })}>
                    <option value="FUNDING">Funding</option>
                    <option value="COLLABORATION">Collaboration</option>
                    <option value="HELP_NEEDED">Help Needed</option>
                    <option value="RESOURCE">Resource</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={requestForm.priority} onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Budget ($)</label>
                  <input type="number" value={requestForm.budget} onChange={e => setRequestForm({ ...requestForm, budget: e.target.value })} placeholder="Optional" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Goal Amount ($)</label>
                  <input type="number" value={requestForm.goalAmount} onChange={e => setRequestForm({ ...requestForm, goalAmount: e.target.value })} placeholder="Funding goal" step="0.01" />
                </div>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={requestForm.isPublic} onChange={e => setRequestForm({ ...requestForm, isPublic: e.target.checked })} />
                  Make Public (visible outside this group)
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" disabled={creatingRequest}>{creatingRequest ? 'Creating...' : 'Create Request'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowRequestModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marketplace Link Modal */}
      {showMarketplaceModal && (
        <div className="modal-overlay" onClick={() => setShowMarketplaceModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Link Marketplace Product</h2>
            <p className={styles.buyModalDesc}>Search for products on the marketplace to link to this group.</p>
            <div className={styles.marketplaceSearchRow}>
              <input
                type="text"
                value={marketplaceSearch}
                onChange={e => setMarketplaceSearch(e.target.value)}
                placeholder="Search products..."
                className={styles.marketplaceSearchInput}
                onKeyDown={e => { if (e.key === 'Enter') searchMarketplace() }}
              />
              <button onClick={searchMarketplace} className={styles.searchBtn}>Search</button>
            </div>
            {marketplaceResults.length > 0 && (
              <div className={styles.marketplaceSearchResults}>
                {marketplaceResults.map(product => (
                  <div key={product.id} className={styles.marketplaceSearchResult}>
                    <div className={styles.searchResultInfo}>
                      <h4>{product.title}</h4>
                      {product.price && <span className={styles.searchResultPrice}>${product.price}</span>}
                      <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                    </div>
                    <button onClick={() => handleLinkProduct(product)} disabled={linkingProduct} className={styles.linkBtn}>
                      {linkingProduct ? '...' : 'Link'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className="btn-ghost" onClick={() => setShowMarketplaceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
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
