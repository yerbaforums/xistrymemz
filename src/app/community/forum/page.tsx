'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './forum.module.css'

interface Post {
  id: string
  title: string
  content: string
  author: { id: string; name: string | null; email: string; image: string | null }
  category: { name: string; slug: string }
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
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

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
  }, [categorySlug])

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newPostTitle, content: newPostContent, category: newPostCategory })
      })
      if (res.ok) {
        setNewPostTitle('')
        setNewPostContent('')
        setNewPostCategory('')
        const updated = await fetch('/api/community/forum').then(r => r.json())
        setPosts(updated.posts || [])
      }
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setPosting(false)
    }
  }

  const filteredPosts = categorySlug 
    ? posts.filter(p => p.category.slug === categorySlug)
    : posts

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Community Forum</h1>
        <p>Connect, share, and discuss with other members</p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.categories}>
            <h3>Categories</h3>
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

        <main className={styles.main}>
          <div className={styles.createPost}>
            <input
              type="text"
              placeholder="Post title..."
              value={newPostTitle}
              onChange={e => setNewPostTitle(e.target.value)}
              className={styles.postInput}
            />
            <textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              className={styles.postTextarea}
              rows={3}
            />
            <div className={styles.postActions}>
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
              <button 
                onClick={handleCreatePost} 
                disabled={posting || !newPostTitle.trim() || !newPostContent.trim()}
                className={styles.postBtn}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading posts...</div>
          ) : error ? (
            <div className={styles.empty}>
              <p>{error}</p>
              <button onClick={fetchForumData} className={styles.postBtn}>Retry</button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className={styles.empty}>No posts yet. Be the first to post!</div>
          ) : (
            <div className={styles.posts}>
              {filteredPosts.map(post => (
                <Link key={post.id} href={`/community/forum/${post.id}`} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <span className={styles.postCategory}>{post.category.name}</span>
                    <span className={styles.postDate}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3>{post.title}</h3>
                  <p className={styles.postPreview}>
                    {post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}
                  </p>
                  <div className={styles.postMeta}>
                    <span>👤 {post.author.name || post.author.email.split('@')[0]}</span>
                    <span>💬 {post.replyCount} replies</span>
                    <span>👁️ {post.viewCount} views</span>
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