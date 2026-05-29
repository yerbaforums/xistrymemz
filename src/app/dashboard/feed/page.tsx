'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'
import MentionInput, { type MentionInputHandle } from '@/components/MentionInput'
import ImageUploader from '@/components/ImageUploader'
import EmojiPicker from 'emoji-picker-react'
import { useTranslations } from 'next-intl'

interface FeedPost {
  id: string
  content: string
  images: string | null
  createdAt: string
  userId: string
  likes: number
  referenceType?: string | null
  referenceId?: string | null
  referenceTitle?: string | null
  user: { id: string; name: string | null; image: string | null; username?: string | null }
  sourceType: 'POST' | 'GROUPPOST' | 'FORUMPOST'
  context?: string | null
  groupName?: string
  groupId?: string
}

const SECTION_CONFIG: Record<string, { label: string; icon: string }> = {
  WALL: { label: 'Wall Posts', icon: '📝' },
  SHOP: { label: 'Shop Posts', icon: '🏪' },
  SCHOOL: { label: 'School Posts', icon: '📚' },
  PROFILE: { label: 'Posts', icon: '👤' },
  GROUPPOST: { label: 'Group Posts', icon: '👥' },
  FORUMPOST: { label: 'Forum Posts', icon: '💬' },
}

function getSectionKey(post: FeedPost): string {
  if (post.sourceType === 'GROUPPOST') return 'GROUPPOST'
  if (post.sourceType === 'FORUMPOST') return 'FORUMPOST'
  return post.context || 'PROFILE'
}

const SECTION_ORDER = ['WALL', 'SHOP', 'SCHOOL', 'PROFILE', 'GROUPPOST', 'FORUMPOST']

export default function DashboardFeed() {
  const t = useTranslations('dashboard')
  const { data: session, status } = useSession()
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [postContent, setPostContent] = useState('')
  const [postImages, setPostImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const mentionRef = useRef<MentionInputHandle>(null)

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || posting || !postContent.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent.trim(),
          images: postImages.length > 0 ? JSON.stringify(postImages) : null,
          context: 'PROFILE',
        })
      })
      if (res.ok) {
        setPostContent('')
        setPostImages([])
        fetchFeed(true)
      }
    } catch {} finally {
      setPosting(false)
    }
  }

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

  const groupedFeed = useMemo(() => {
    const groups: Record<string, FeedPost[]> = {}
    for (const post of feed) {
      const key = getSectionKey(post)
      if (!groups[key]) groups[key] = []
      groups[key].push(post)
    }
    const ordered: { key: string; posts: FeedPost[] }[] = []
    for (const orderKey of SECTION_ORDER) {
      if (groups[orderKey]?.length) {
        ordered.push({ key: orderKey, posts: groups[orderKey] })
      }
    }
    return ordered
  }, [feed])

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t('loading')}</p>
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
        <span className="breadcrumb-current">{t('feed')}</span>
      </nav>

      <h1 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>{t('title')}</h1>

      {session && (
        <form onSubmit={handleCreatePost} style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}>
          <MentionInput
            ref={mentionRef}
            value={postContent}
            onChange={setPostContent}
            placeholder="What's on your mind?"
            rows={2}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', position: 'relative' }}>
            <button type="button" onClick={() => mentionRef.current?.insertAtCursor('@')}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1 }}>
              @
            </button>
            <button type="button" onClick={() => setShowEmoji(!showEmoji)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1 }}>
              😊
            </button>
            <ImageUploader images={postImages} onChange={setPostImages} />
            {showEmoji && (
              <div style={{ position: 'absolute', top: 36, left: 0, zIndex: 100 }}>
                <EmojiPicker onEmojiClick={(e) => { mentionRef.current?.insertAtCursor(e.emoji); setShowEmoji(false) }} />
              </div>
            )}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 8,
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {postContent.length}/2000
            </span>
            <button type="submit" disabled={posting || !postContent.trim()}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: postContent.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: postContent.trim() ? '#fff' : 'var(--text-muted)',
                cursor: postContent.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem', fontWeight: 600,
              }}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {feed.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {groupedFeed.map(({ key, posts }) => {
              const config = SECTION_CONFIG[key] || SECTION_CONFIG.PROFILE
              const isCollapsed = collapsedSections.has(key)
              return (
                <section key={key}>
                  <button
                    onClick={() => toggleSection(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginBottom: '12px',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{config.icon} {config.label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ({posts.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {posts.map((item, i) => (
                        <FeedItem key={`${item.sourceType}-${item.id}-${i}`} post={item} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
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
                {loadingMore ? t('loading') : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📡</div>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Your feed is empty</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Share something with the community or connect with others!
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/feed" className="btn-primary" style={{ padding: '10px 24px', borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none' }}>
              ✏️ Create Your First Post
            </Link>
            <Link href="/community" className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
              👥 Find People
            </Link>
            <Link href="/community/groups" className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
              👤 Join Groups
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
