'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'

interface PostItem {
  id: string
  content: string
  images: string | null
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

export default function HashtagPage() {
  const params = useParams()
  const tag = typeof params.tag === 'string' ? params.tag.toLowerCase() : ''
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    fetch(`/api/posts?tag=${encodeURIComponent(tag)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || [])
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [tag])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <nav className="breadcrumbs" style={{ marginBottom: '16px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/search" className="breadcrumb-link">Search</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">#{tag}</span>
      </nav>

      <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>#{tag}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        {posts.length} post{posts.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      ) : posts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map(post => (
            <FeedItem key={post.id} post={{ ...post, sourceType: 'POST' }} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No posts with #{tag} yet</p>
          <p>Be the first to use this hashtag!</p>
        </div>
      )}
    </div>
  )
}
