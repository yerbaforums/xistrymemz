'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import MentionInput, { type MentionInputHandle } from '@/components/MentionInput'
import { getUserProfileUrl } from '@/lib/utils'
import HashtagText from '@/components/HashtagText'
import ImageUploader from '@/components/ImageUploader'
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

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PROPOSED: { label: '💡 Proposed', className: 'statusProposed' },
  UNDER_REVIEW: { label: '🔍 Under Review', className: 'statusReview' },
  ACCEPTED: { label: '✅ Accepted', className: 'statusAccepted' },
  IMPLEMENTED: { label: '🚀 Implemented', className: 'statusImplemented' },
  REJECTED: { label: '❌ Rejected', className: 'statusRejected' },
}

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
  _count: { posts: number }
}

export default function ForumPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { success, error } = useToast()
  const categorySlug = searchParams.get('category')
  const typeParam = searchParams.get('type')

  const [categories, setCategories] = useState<Category[]>([])
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
  const mentionRef = useRef<MentionInputHandle>(null)

  const fetchForumData = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/community/forum')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const cats = data?.data?.categories || data?.categories || []
      setCategories(cats)
      setPosts(data?.data?.posts || data?.posts || [])

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
  }, [fetchForumData, categorySlug, sortBy])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const filteredPosts = (() => {
    let result = posts
    if (searchQuery.trim()) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (categorySlug) {
      result = result.filter(p => p.category.slug === categorySlug)
    }
    if (typeParam) {
      result = result.filter(p => p.postType === typeParam)
    }
    return result
  })()

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'top':
        return (b.score || 0) - (a.score || 0)
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'mostReplies':
        return b.replyCount - a.replyCount
      case 'mostViews':
        return b.viewCount - a.viewCount
      case 'mostTips':
        return b.totalTips - a.totalTips
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

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
    }

    setPosting(true)
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        success('Post created!')
        setNewPostTitle('')
        setNewPostContent('')
        setNewPostCategory('')
        setIsPoll(false)
        setPostType('')
        setPollOptions(['', '', '', ''])
        setPostImages([])
        const updated = await fetch('/api/community/forum').then(r => r.json())
        setPosts(updated?.data?.posts || updated?.posts || [])
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

            <Link 
              href="/community/forum" 
              className={`${styles.categoryLink} ${!categorySlug ? styles.active : ''}`}
            >
              All Posts
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/community/forum?category=${cat.slug}`}
                className={`${styles.categoryLink} ${categorySlug === cat.slug ? styles.active : ''}`}
              >
                <span>{cat.icon}</span>
                {cat.name}
                <span className={styles.catCount}>{cat._count.posts}</span>
              </Link>
            ))}
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
                {categories.map(cat => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
              <ImageUploader images={postImages} onChange={setPostImages} maxImages={6} />
              <Button 
                variant="primary"
                onClick={handleCreatePost} 
                disabled={posting || !newPostTitle.trim() || !newPostContent.trim()}
                className={styles.postBtn}
              >
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>

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
          ) : sortedPosts.length === 0 ? (
            <EmptyState icon="💬" title="No posts yet" description="Be the first to post!" />
          ) : (
            <div className={styles.posts}>
              {sortedPosts.map(post => (
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
        </main>
      </div>
    </div>
  )
}