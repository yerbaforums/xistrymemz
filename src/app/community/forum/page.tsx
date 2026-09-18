'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MentionInput, { type MentionInputHandle } from '@/components/MentionInput'
import { getUserProfileUrl } from '@/lib/utils'
import HashtagText from '@/components/HashtagText'
import ImageUploader from '@/components/ImageUploader'
import LinkItemModal from '@/components/LinkItemModal'
import Modal from '@/components/ui/Modal'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import Skeleton from '@/components/Skeleton'
import Button from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import styles from './forum.module.css'

const POST_TYPES = [
  { value: '', label: 'All', icon: '🌐' },
  { value: 'IDEA', label: 'Ideas', icon: '💡' },
  { value: 'DEBATE', label: 'Debates', icon: '⚖️' },
  { value: 'GENERAL', label: 'General', icon: '💬' },
] as const

const PAGE_SIZE = 21 // fetch limit + 1 sentinel to detect whether more pages exist

const SORT_MAP: Record<string, string> = {
  top: 'score',
  oldest: 'oldest',
  mostReplies: 'mostReplies',
  mostViews: 'mostViews',
  mostTips: 'mostTips',
}

// Server-side filtering: search, sort, type and category (including
// subcategories, reddit-style) are applied by GET /api/forum/posts so the
// whole forum is browsable, not just the first page.
function buildPostsUrl(off: number, cats: Category[], catSlug: string | null, sort: string, type: string | null, q: string) {
  const params = new URLSearchParams()
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(off))
  if (q && q.trim()) params.set('q', q.trim())
  if (sort !== 'newest') params.set('sortBy', SORT_MAP[sort] || 'score')
  if (type) params.set('postType', type)
  const selected = cats.find(c => c.slug === catSlug)
  if (selected) {
    const ids = [selected.id]
    selected.children?.forEach(ch => {
      ids.push(ch.id)
      ch.children?.forEach(g => ids.push(g.id))
    })
    params.set('categoryIds', ids.join(','))
  }
  return `/api/forum/posts?${params.toString()}`
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PROPOSED: { label: '💡 Proposed', className: 'statusProposed' },
  UNDER_REVIEW: { label: '🔍 Under Review', className: 'statusReview' },
  ACCEPTED: { label: '✅ Accepted', className: 'statusAccepted' },
  IMPLEMENTED: { label: '🚀 Implemented', className: 'statusImplemented' },
  REJECTED: { label: '❌ Rejected', className: 'statusRejected' },
}

const badgeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.9rem',
  padding: 0,
} as const

const inputStyle = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  flex: 1,
  minWidth: 0,
} as const

interface Post {
  id: string
  title: string
  content: string
  postType: string
  status: string
  score: number
  myVote?: number
  author: { id: string; name: string | null; username: string | null; email: string; image: string | null; shopSlug: string | null }
  category: { name: string; slug: string }
  isPoll: boolean
  pollType: string
  pollOptions: { id: string; optionText: string; voteCount: number; sortOrder: number }[]
  totalVotes: number
  totalTips: number
  tippers: number
  viewCount: number
  replyCount: number
  createdAt: string
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description?: string | null
  status?: string
  parentId?: string | null
  parent?: { id: string; name: string; slug: string; icon: string } | null
  children?: Category[]
  createdBy?: { id: string; name: string | null; username: string | null } | null
  _count: { posts: number }
}

interface PendingLink {
  type: string
  id: string
  title: string
  relationType: string
}

function extractCreatedId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.id === 'string') return b.id
  const d = b.data as Record<string, unknown> | undefined
  if (d && typeof d.id === 'string') return d.id
  const d2 = d?.data as Record<string, unknown> | undefined
  if (d2 && typeof d2.id === 'string') return d2.id
  return null
}

export default function ForumPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { success, error } = useToast()
  const { data: session } = useSession()
  const categorySlug = searchParams.get('category')
  const typeParam = searchParams.get('type')

  const [categories, setCategories] = useState<Category[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catIcon, setCatIcon] = useState('📁')
  const [catParentId, setCatParentId] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostCategory, setNewPostCategory] = useState('')
  const [postType, setPostType] = useState('');
  const [isPoll, setIsPoll] = useState(false)
  const [pollType, setPollType] = useState('single')
  const [pollOptions, setPollOptions] = useState(['', '', '', ''])
  const [posting, setPosting] = useState(false)
  const [postImages, setPostImages] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [pollEndsAt, setPollEndsAt] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [activeSearch, setActiveSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const mentionRef = useRef<MentionInputHandle>(null)

  // Keeps the latest filters available to the stable fetch/loadMore callbacks.
  const filterRef = useRef({ categorySlug, sortBy, typeParam, activeSearch })
  useEffect(() => {
    filterRef.current = { categorySlug, sortBy, typeParam, activeSearch }
  }, [categorySlug, sortBy, typeParam, activeSearch])

  const fetchForumData = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const params = filterRef.current
      const forumRes = await fetch('/api/community/forum')
      if (!forumRes.ok) throw new Error('Failed to fetch')
      const data = await forumRes.json()
      const cats = data?.data?.categories || data?.categories || []
      setCategories(cats)
      setIsAdmin(!!data?.data?.isAdmin)

      const postsRes = await fetch(buildPostsUrl(0, cats, params.categorySlug, params.sortBy, params.typeParam, params.activeSearch))
      if (!postsRes.ok) throw new Error('Failed to fetch posts')
      const postsData = await postsRes.json()
      const incoming = (postsData?.data || postsData || []) as Post[]
      const pagePosts = incoming.slice(0, PAGE_SIZE - 1)
      setPosts(pagePosts)
      setHasMore(incoming.length === PAGE_SIZE)
      setOffset(pagePosts.length)

      if (cats.length === 0) {
        await seedCategories()
      }
    } catch {
      setErrorMsg('Failed to load forum. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const seedCategories = async () => {
    try {
      await fetch('/api/forum/categories/seed', { method: 'POST' })
      await fetchForumData()
    } catch {
      // Silently fail
    }
  }

  useEffect(() => {
    fetchForumData()
  }, [fetchForumData, categorySlug, sortBy, typeParam, activeSearch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearch(searchQuery.trim())
  }

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const params = filterRef.current
      const postsRes = await fetch(buildPostsUrl(offset, categories, params.categorySlug, params.sortBy, params.typeParam, params.activeSearch))
      if (!postsRes.ok) throw new Error('Failed to fetch posts')
      const postsData = await postsRes.json()
      const incoming = (postsData?.data || postsData || []) as Post[]
      const pagePosts = incoming.slice(0, PAGE_SIZE - 1)
      setPosts(prev => [...prev, ...pagePosts])
      setHasMore(incoming.length === PAGE_SIZE)
      setOffset(prev => prev + pagePosts.length)
    } catch {
      error('Failed to load more posts')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleVote = async (postId: string, value: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const target = posts.find(p => p.id === postId)
    if (!target) return
    const current = target.myVote || 0
    let finalValue = value
    if (current === value) finalValue = 0
    try {
      const res = await fetch('/api/forum/vote', {
        method: finalValue === 0 ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, value: finalValue })
      })
      if (res.ok) {
        const data = await res.json()
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, score: data?.data?.score ?? (p.score || 0), myVote: finalValue } : p))
      } else {
        const data = await res.json()
        error(data.error || 'Failed to vote')
      }
    } catch {
      error('Failed to vote')
    }
  }

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return

    const categoryObj = categories.find(c => c.slug === newPostCategory)
    const payload: Record<string, unknown> = {
      title: newPostTitle,
      content: newPostContent,
      categoryId: categoryObj?.id || '',
      images: postImages.length > 0 ? postImages : undefined,
      postType: postType || undefined
    }

    if (isPoll) {
      payload.isPoll = true
      payload.pollType = pollType
      payload.pollOptions = pollOptions.filter(o => o.trim())
      if (pollEndsAt) payload.pollEndsAt = pollEndsAt
    }

    setPosting(true)
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const body = await res.json().catch(() => null)
        const createdId = extractCreatedId(body)
        // Create the backlink to the linked listing now that the post exists.
        if (createdId && pendingLink) {
          fetch('/api/reference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceType: 'FORUMPOST',
              sourceId: createdId,
              targetType: pendingLink.type,
              targetId: pendingLink.id,
              relationType: pendingLink.relationType,
            }),
          }).catch(() => {})
        }
        success('Post created!')
        setNewPostTitle('')
        setNewPostContent('')
        setNewPostCategory('')
        setIsPoll(false)
        setPostType('')
        setPollOptions(['', '', '', ''])
        setPollEndsAt('')
        setPostImages([])
        setPendingLink(null)
        fetchForumData()
      } else {
        const data = await res.json()
        error(data.error || 'Failed to create post')
      }
    } catch {
      error('Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const setTypeFilter = (type: string) => {
    const url = new URL(window.location.href)
    if (type) url.searchParams.set('type', type)
    else url.searchParams.delete('type')
    router.push(url.pathname + url.search)
  }

  // Reddit-style: main categories with nested subcategories, plus
  // community-submitted categories awaiting approval.
  const visibleCats = categories.filter(c => isAdmin || c.status === 'APPROVED')
  const mainCats = visibleCats.filter(c => !c.parentId)
  const myPendingCats = categories.filter(c => c.status === 'PENDING' && c.createdBy?.id === session?.user?.id)
  const pendingCats = isAdmin ? categories.filter(c => c.status === 'PENDING') : myPendingCats
  const categoryOptions = mainCats.flatMap(main => [
    { slug: main.slug, name: `${main.icon} ${main.name}` },
    ...(main.children || [])
      .filter(c => isAdmin || c.status === 'APPROVED')
      .map(sub => ({ slug: sub.slug, name: `— ${sub.name}` })),
  ])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    setCreatingCategory(true)
    try {
      const res = await fetch('/api/forum/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName,
          description: catDesc,
          icon: catIcon,
          parentId: catParentId || undefined,
        }),
      })
      if (res.ok) {
        success(isAdmin ? 'Category created!' : 'Category submitted for review — it will appear once approved.')
        setShowCategoryModal(false)
        setCatName('')
        setCatDesc('')
        setCatIcon('📁')
        setCatParentId('')
        fetchForumData()
      } else {
        const d = await res.json()
        error(d.error || 'Failed to create category')
      }
    } catch {
      error('Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleCategoryStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/forum/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        success(status === 'APPROVED' ? 'Category approved' : 'Category rejected')
        fetchForumData()
      } else {
        const d = await res.json()
        error(d.error || 'Failed to update category')
      }
    } catch {
      error('Failed to update category')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/forum/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Category deleted')
        fetchForumData()
      } else {
        const d = await res.json()
        error(d.error || 'Failed to delete category')
      }
    } catch {
      error('Failed to delete category')
    }
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Community', href: '/community' },
        { label: 'Forum' },
      ]} />
      <div className={styles.header}>
        <h1>Community Forum</h1>
        <p>Connect, share, and discuss with other members</p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.categories}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Categories
              </span>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                title="Create a main or sub category"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.05rem', color: 'var(--text-muted)', padding: 0 }}
              >
                ➕
              </button>
            </div>

            <Link
              href="/community/forum"
              className={`${styles.categoryLink} ${!categorySlug ? styles.active : ''}`}
            >
              <span>🌐</span>
              All Posts
            </Link>

            {mainCats.map(main => {
              const subs = (main.children || []).filter(c => isAdmin || c.status === 'APPROVED')
              const total = main._count.posts + subs.reduce((s, c) => s + (c._count?.posts || 0), 0)
              return (
                <div key={main.id}>
                  <Link
                    href={`/community/forum?category=${main.slug}`}
                    className={`${styles.categoryLink} ${categorySlug === main.slug ? styles.active : ''}`}
                  >
                    <span>{main.icon}</span>
                    {main.name}
                    <span className={styles.catCount}>{total}</span>
                  </Link>
                  {subs.map(sub => (
                    <Link
                      key={sub.id}
                      href={`/community/forum?category=${sub.slug}`}
                      className={`${styles.categoryLink} ${categorySlug === sub.slug ? styles.active : ''}`}
                      style={{ paddingLeft: 34, fontSize: '0.85rem' }}
                    >
                      <span>{sub.icon}</span>
                      {sub.name}
                      <span className={styles.catCount}>{sub._count?.posts || 0}</span>
                    </Link>
                  ))}
                </div>
              )
            })}

            {pendingCats.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary)', padding: '0 8px' }}>
                  Pending approval
                </span>
                {pendingCats.map(cat => (
                  <div key={cat.id} style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cat.description || cat.name}>
                      {cat.icon} {cat.name}
                      {!isAdmin && (cat.createdBy?.name || cat.createdBy?.username) && (
                        <span style={{ color: 'var(--text-muted)' }}> · by {cat.createdBy?.name || cat.createdBy?.username}</span>
                      )}
                    </span>
                    {isAdmin ? (
                      <>
                        <button type="button" onClick={() => handleCategoryStatus(cat.id, 'APPROVED')} title="Approve" style={badgeBtnStyle}>✅</button>
                        <button type="button" onClick={() => handleCategoryStatus(cat.id, 'REJECTED')} title="Reject" style={badgeBtnStyle}>❌</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => handleDeleteCategory(cat.id)} title="Withdraw request" style={badgeBtnStyle}>🗑️</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className={`${styles.main} page-enter`}>
          <div className={styles.toolbar}>
            <div className={styles.typeTabs}>
              {POST_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={`${styles.typeTab} ${(typeParam || '') === t.value ? styles.active : ''}`}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </form>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="newest">Newest</option>
              <option value="top">Top (Votes)</option>
              <option value="oldest">Oldest</option>
              <option value="mostReplies">Most Replies</option>
              <option value="mostViews">Most Views</option>
              <option value="mostTips">Most Tips</option>
            </select>
          </div>

          <div className={styles.createPost}>
            <input
              type="text"
              placeholder="Post title..."
              value={newPostTitle}
              onChange={e => setNewPostTitle(e.target.value)}
              className={styles.postInput}
            />
            <div className={styles.mentionInputWrapper}>
              <MentionInput
                ref={mentionRef}
                value={newPostContent}
                onChange={setNewPostContent}
                placeholder="What's on your mind?"
                rows={isPoll ? 2 : 3}
                className={styles.postTextarea}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => mentionRef.current?.insertAtCursor('@')}
                className={styles.mentionBtn}
                title="Mention someone"
              >
                @
              </Button>
            </div>
            
            <div className={styles.postActions}>
              <select
                value={postType}
                onChange={e => setPostType(e.target.value)}
                className={styles.categorySelect}
              >
                <option value="">General Post</option>
                <option value="IDEA">💡 Share an Idea</option>
                <option value="DEBATE">⚖️ Start a Debate</option>
              </select>
              <label className={styles.pollToggle}>
                <input
                  type="checkbox"
                  checked={isPoll}
                  onChange={e => setIsPoll(e.target.checked)}
                />
                Create Poll
              </label>
              <select
                value={newPostCategory}
                onChange={e => setNewPostCategory(e.target.value)}
                className={styles.categorySelect}
              >
                <option value="">Select category</option>
                {categoryOptions.map(opt => (
                  <option key={opt.slug} value={opt.slug}>{opt.name}</option>
                ))}
              </select>
              <ImageUploader images={postImages} onChange={setPostImages} maxImages={6} />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowLinkModal(true)}
                className={styles.mentionBtn}
                title="Link a listing, product, event or group"
              >
                🔗
              </Button>
              <Button 
                variant="primary"
                onClick={handleCreatePost} 
                disabled={posting || !newPostTitle.trim() || !newPostContent.trim()}
                className={styles.postBtn}
              >
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>

            {pendingLink && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                <span>🔗 {pendingLink.title}</span>
                <button
                  type="button"
                  onClick={() => setPendingLink(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  aria-label="Remove linked item"
                >
                  ✕
                </button>
              </div>
            )}

            {postType === 'IDEA' && (
              <div className={styles.typeHint}>
                💡 <strong>Idea tip:</strong> Describe the <em>problem</em>, your proposed <em>solution</em>, and who it helps. Members can upvote it to move it toward implementation.
              </div>
            )}
            {postType === 'DEBATE' && (
              <div className={styles.typeHint}>
                ⚖️ <strong>Debate tip:</strong> State your position clearly. Replies can be tagged PRO / CON / NEUTRAL to structure the argument.
              </div>
            )}

            {isPoll && (
              <div className={styles.pollOptions}>
                <div className={styles.pollTypeSelect}>
                  <label>
                    <input
                      type="radio"
                      name="pollType"
                      value="single"
                      checked={pollType === 'single'}
                      onChange={() => setPollType('single')}
                    />
                    Single Choice
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="pollType"
                      value="multi"
                      checked={pollType === 'multi'}
                      onChange={() => setPollType('multi')}
                    />
                    Multiple Choices
                  </label>
                </div>
                <div className={styles.pollInputGrid}>
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...pollOptions]
                        newOpts[idx] = e.target.value
                        setPollOptions(newOpts)
                      }}
                      className={styles.pollOptionInput}
                    />
                  ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Poll ends at
                  <input
                    type="datetime-local"
                    value={pollEndsAt}
                    onChange={e => setPollEndsAt(e.target.value)}
                    className={styles.pollOptionInput}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </label>
                {pollOptions.length < 6 && (
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className={styles.addPollOptionBtn}
                  >
                    + Add Option
                  </Button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.postCard}>
                  <Skeleton width="30%" height="0.8rem" />
                  <Skeleton width="80%" height="1.2rem" />
                  <Skeleton width="100%" height="0.9rem" />
                </div>
              ))}
            </div>
          ) : errorMsg ? (
            <div className={styles.empty}>
              <p>{errorMsg}</p>
              <Button variant="primary" onClick={fetchForumData} className={styles.postBtn}>Retry</Button>
            </div>
          ) : posts.length === 0 ? (
            <EmptyState icon="💬" title="No posts yet" description="Be the first to post!" />
          ) : (
            <div className={styles.posts}>
              {posts.map(post => (
                <Link key={post.id} href={`/community/forum/${post.id}`} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <span className={styles.postCategory}>{post.category.name}</span>
                    <span className={styles.postDate}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3>{post.title}</h3>
                  {post.postType !== 'GENERAL' && post.postType && (
                    <div className={styles.postTypeBadges}>
                      <span className={styles[`typeBadge_${post.postType}`]}>
                        {post.postType === 'IDEA' ? '💡 Idea' : post.postType === 'DEBATE' ? '⚖️ Debate' : ''}
                      </span>
                      {post.status && post.status !== 'NONE' && STATUS_BADGES[post.status] && (
                        <span className={styles[STATUS_BADGES[post.status].className]}>{STATUS_BADGES[post.status].label}</span>
                      )}
                    </div>
                  )}
                  <p className={styles.postPreview}>
                    <HashtagText text={post.content} mentionLinks truncate={150} />
                  </p>
                  <div className={styles.postMeta}>
                    <Link href={getUserProfileUrl(post.author)} onClick={e => e.stopPropagation()}>
                      👤 {post.author.name || 'Anonymous'}
                    </Link>
                    {post.isPoll ? (
                      <>
                        <span>📊 {post.totalVotes || 0} votes</span>
                        <span className={styles.pollBadge}>Poll</span>
                      </>
                    ) : (
                      <>
                        <span>💬 {post.replyCount} replies</span>
                        <span>👁️ {post.viewCount} views</span>
                      </>
                    )}
                  </div>
                  <div className={styles.voteStrip}>
                    <button
                      onClick={e => handleVote(post.id, 1, e)}
                      className={`${styles.voteBtn} ${post.myVote === 1 ? styles.voteActive : ''}`}
                      aria-label="Upvote"
                    >
                      ▲
                    </button>
                    <span className={styles.voteScore}>{post.score || 0}</span>
                    <button
                      onClick={e => handleVote(post.id, -1, e)}
                      className={`${styles.voteBtn} ${post.myVote === -1 ? styles.voteDown : ''}`}
                      aria-label="Downvote"
                    >
                      ▼
                    </button>
                  </div>
                </Link>
              ))}
            </div>
            )}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <Button variant="primary" onClick={loadMore} disabled={loadingMore} className={styles.postBtn}>
                  {loadingMore ? 'Loading more...' : 'Load more posts'}
                </Button>
              </div>
            )}
        </main>
      </div>

      <LinkItemModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        sourceType="FORUMPOST"
        sourceId=""
        onLinked={() => setShowLinkModal(false)}
        deferCommit
        onSelect={(target, relationType) => {
          setPendingLink({ type: target.type, id: target.id, title: target.title, relationType })
          setShowLinkModal(false)
        }}
      />

      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
        <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Create a category</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Start a <strong>main category</strong> or a <strong>subcategory</strong> under an existing one.
            {!isAdmin && ' Your submission will appear once an admin approves it.'}
          </p>
          <input
            type="text"
            placeholder="Category name (e.g. Gardening)"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            maxLength={40}
            style={inputStyle}
            required
          />
          <input
            type="text"
            placeholder="Short description (optional)"
            value={catDesc}
            onChange={e => setCatDesc(e.target.value)}
            maxLength={120}
            style={inputStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="Icon emoji"
              value={catIcon}
              onChange={e => setCatIcon(e.target.value)}
              maxLength={4}
              style={{ ...inputStyle, width: 90 }}
              aria-label="Category icon emoji"
            />
            <select
              value={catParentId}
              onChange={e => setCatParentId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Main category —</option>
              {mainCats.map(m => (
                <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button type="button" variant="ghost" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={creatingCategory || !catName.trim()}>
              {creatingCategory ? 'Creating...' : 'Create category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}