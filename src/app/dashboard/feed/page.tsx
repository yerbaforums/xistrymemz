'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'
import MentionInput, { type MentionInputHandle } from '@/components/MentionInput'
import ImageUploader from '@/components/ImageUploader'
import dynamic from 'next/dynamic'
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })
import { useTranslations } from 'next-intl'

import Button from '@/components/ui/Button'
import styles from './page.module.css'

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
  repostCount?: number
  reposted?: boolean
}

interface TrendingTag {
  tag: string
  count: number
}

const CONTEXT_LABELS: Record<string, string> = {
  WALL: '📝 Wall',
  SHOP: '🏪 Shop',
  SCHOOL: '📚 School',
  PROFILE: '👤 Post',
  REPOST: '🔁 Repost',
  GROUPPOST: '👥 Group',
  FORUMPOST: '💬 Forum',
}

function getContextLabel(post: FeedPost): string {
  if (post.sourceType === 'GROUPPOST') return CONTEXT_LABELS.GROUPPOST
  if (post.sourceType === 'FORUMPOST') return CONTEXT_LABELS.FORUMPOST
  return CONTEXT_LABELS[post.context || 'PROFILE'] || CONTEXT_LABELS.PROFILE
}

export default function DashboardFeed() {
  const t = useTranslations('dashboard')
  const { data: session, status } = useSession()
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postImages, setPostImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([])
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
        setOffset(prev => prev + data.feed.length)
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
    fetch('/api/hashtags?mode=trending&limit=12')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTrendingTags(Array.isArray(data) ? data : data?.tags || []))
      .catch(() => {})
  }, [session, status])

  const loadMore = () => {
    setLoadingMore(true)
    fetchFeed()
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.metaText}>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('feed')}</h1>

      {session && (
        <form id="feed-post-form" onSubmit={handleCreatePost} className={styles.card}>
          <MentionInput
            ref={mentionRef}
            value={postContent}
            onChange={setPostContent}
            placeholder="What's on your mind?"
            rows={2}
          />
          <div className={`${styles.flex} ${styles.gap6} ${styles.mt8} ${styles.flexCenter} ${styles.relative}`}>
            <button type="button" onClick={() => mentionRef.current?.insertAtCursor('@')}
              className={styles.toolBtn}>
              @
            </button>
            <button type="button" onClick={() => setShowEmoji(!showEmoji)}
              className={styles.toolBtn}>
              😊
            </button>
            <ImageUploader images={postImages} onChange={setPostImages} />
            {showEmoji && (
              <div className={styles.absoluteEmoji}>
                <EmojiPicker onEmojiClick={(e) => { mentionRef.current?.insertAtCursor(e.emoji); setShowEmoji(false) }} />
              </div>
            )}
          </div>
          <div className={`${styles.flexBetween} ${styles.mt8}`}>
            <span className={styles.metaText}>
              {postContent.length}/2000
            </span>
            <button type="submit" disabled={posting || !postContent.trim()}
              className={styles.submitBtnBase}
              style={{
                background: postContent.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: postContent.trim() ? '#fff' : 'var(--text-muted)',
                cursor: postContent.trim() ? 'pointer' : 'not-allowed',
              }}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {trendingTags.length > 0 && (
        <div className={`${styles.trendingCard} ${styles.mb20}`}>
          <div className={`${styles.flexCenter} ${styles.gap8} ${styles.mb8}`}>
            <span className={styles.sectionHeading}>🏷️ Trending Hashtags</span>
          </div>
          <div className={`${styles.flexWrap} ${styles.gap6}`}>
            {trendingTags.map((tag) => (
              <Link
                key={tag.tag}
                href={`/hashtag/${tag.tag}`}
                className={styles.chip}
              >
                #{tag.tag} <span className={styles.chipCount}>({tag.count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={`${styles.quickLinksCard} ${styles.mb20}`}>
        <span className={styles.sectionHeading}>⚡ Quick Links</span>
        <Link href="/hashtags" className={styles.chip}>🏷️ Browse Hashtags</Link>
        <Link href="/products" className={`${styles.metaText} ${styles.textDecorationNone}`}>🛒 Marketplace</Link>
        <Link href="/events" className={`${styles.metaText} ${styles.textDecorationNone}`}>📅 Events</Link>
        <Link href="/community" className={`${styles.metaText} ${styles.textDecorationNone}`}>👥 Community</Link>
        <Link href="/dashboard/passport" className={`${styles.metaText} ${styles.textDecorationNone}`}>🌍 Passport</Link>
      </div>

      {feed.length > 0 ? (
        <>
          <div className={`${styles.flexCol} ${styles.gap16}`}>
            {feed.map((item, i) => (
              <div key={`${item.sourceType}-${item.id}-${i}`}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 4 }}>{getContextLabel(item)}</div>
                <FeedItem post={item} />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className={`${styles.textCenter} ${styles.mt24}`}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={styles.loadMoreBtn}
              >
                {loadingMore ? t('loading') : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <div className={`${styles.mb16} ${styles.fs3rem}`}>📡</div>
          <h3 className={`${styles.mb8} ${styles.textPrimary}`}>Your feed is empty</h3>
          <p className={`${styles.textSecondary} ${styles.mb20} ${styles.fs09}`}>
            Share something with the community or connect with others!
          </p>
          <div className={`${styles.flex} ${styles.gap12} ${styles.flexCenter} ${styles.flexWrap} ${styles.justifyCenter}`}>
            <Button onClick={() => {
              const form = document.getElementById('feed-post-form')
              form?.scrollIntoView({ behavior: 'smooth' })
              setTimeout(() => (form?.querySelector('textarea') as HTMLElement)?.focus(), 300)
            }} variant="primary" className={styles.heroBtn}>
              ✏️ Create Your First Post
            </Button>
            <Link href="/community" className={styles.sectionLink}>
              <Button variant="secondary">👥 Find People</Button>
            </Link>
            <Link href="/community/groups" className={styles.sectionLink}>
              <Button variant="secondary">👤 Join Groups</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
