'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'

interface FeedPost {
  id: string
  content: string
  images: string | null
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
  sourceType: 'POST' | 'GROUPPOST' | 'FORUMPOST'
  groupName?: string
  groupId?: string
}

export default function DashboardFeed() {
  const { data: session, status } = useSession()
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchFeed = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    try {
      const url = `/api/feed?limit=20&offset=${currentOffset}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setFeed(data.feed)
        } else {
          setFeed(prev => [...prev, ...data.feed])
        }
        setHasMore(data.feed.length === 20)
        setOffset(currentOffset + data.feed.length)
      }
    } catch {} finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [offset])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) { redirect('/auth/login'); return }
    fetchFeed(true)
  }, [session, status])

  const loadMore = () => {
    setLoadingMore(true)
    fetchFeed()
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading feed...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <nav className="breadcrumbs" style={{ marginBottom: '16px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">Feed</span>
      </nav>

      <h1 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>Your Feed</h1>

      {feed.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {feed.map((item, i) => (
              <FeedItem key={`${item.sourceType}-${item.id}-${i}`} post={item} />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 24px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Your feed is empty</p>
          <p>Connect with others and follow hashtags to populate your feed</p>
        </div>
      )}
    </div>
  )
}
