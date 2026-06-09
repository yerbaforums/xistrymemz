'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import MentionInput, { type MentionInputHandle } from '@/components/MentionInput'
import { getUserProfileUrl } from '@/lib/utils'
import HashtagText from '@/components/HashtagText'
import ImageUploader from '@/components/ImageUploader'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import Button from '@/components/ui/Button'
import styles from './forum.module.css'

interface Post {
  id: string
  title: string
  content: string
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
  const categorySlug = searchParams.get('category')
  
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostCategory, setNewPostCategory] = useState('')
  const [isPoll, setIsPoll] = useState(false)
  const [pollType, setPollType] = useState('single')
  const [pollOptions, setPollOptions] = useState(['', '', '', ''])
  const [posting, setPosting] = useState(false)
  const [postImages, setPostImages] = useState<string[]>([])
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const mentionRef = useRef<MentionInputHandle>(null)

  const fetchForumData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/community/forum')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCategories(data.categories || [])
      setPosts(data.posts || [])
      
      if (data.categories?.length === 0) {
        await seedCategories()
      }
    } catch {
      setError('Failed to load forum. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
  }, [categorySlug, sortBy])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const filtered = searchQuery.trim()
      ? posts.filter(p => 
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : (categorySlug ? posts.filter(p => p.category.slug === categorySlug) : posts)
    setPosts(filtered)
  }

  const filteredPosts = categorySlug 
    ? posts.filter(p => p.category.slug === categorySlug)
    : posts

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
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

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return
    
    const categoryObj = categories.find(c => c.slug === newPostCategory)
    const payload: Record<string, unknown> = { 
      title: newPostTitle, 
      content: newPostContent, 
      categoryId: categoryObj?.id || '',
      images: postImages.length > 0 ? postImages : undefined
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
        setNewPostTitle('')
        setNewPostContent('')
        setNewPostCategory('')
        setIsPoll(false)
        setPollOptions(['', '', '', ''])
        setPostImages([])
        const updated = await fetch('/api/community/forum').then(r => r.json())
        setPosts(updated.posts || [])
      }
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setPosting(false)
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
            <div className={styles.loading}>Loading posts...</div>
          ) : error ? (
            <div className={styles.empty}>
              <p>{error}</p>
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
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}