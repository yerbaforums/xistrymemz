'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'

interface PostData {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  coverImage: string | null
  status: string
  visibility: string
  tier: string | null
  price: number
  currency: string
  tags: string | null
  viewCount: number
  likeCount: number
  locked: boolean
  isOwner: boolean
  liked: boolean
  publishedAt: string | null
  createdAt: string
  blog: {
    id: string
    blogName: string | null
    blogSlug: string | null
    blogImage: string | null
    blogTagline: string | null
    name: string | null
    image: string | null
  }
  _count: { likes: number; purchases: number; tips: number }
}

const VISIBILITY_LABELS: Record<string, { label: string; icon: string }> = {
  FREE: { label: 'Free', icon: '🔓' },
  SUBSCRIBERS: { label: 'Subscribers only', icon: '💠' },
  PAID: { label: `Paid`, icon: '💰' },
}

function AccessGate({
  post,
  onRequestPurchase,
  onSubscribe,
  purchasing,
  subscribing,
}: {
  post: PostData
  onRequestPurchase: () => void
  onSubscribe: () => void
  purchasing: boolean
  subscribing: boolean
}) {
  return (
    <div className={styles.gate}>
      <div className={styles.gateIcon}>{VISIBILITY_LABELS[post.visibility]?.icon || '🔒'}</div>
      <h2>Unlock this post</h2>
      <p className={styles.gateText}>
        {post.visibility === 'SUBSCRIBERS' && 'This post is for subscribers only. Subscribe for free to unlock it.'}
        {post.visibility === 'PAID' && `This post costs ${post.price} ${post.currency || 'USD'} to unlock, or subscribe to the blog for full access.`}
      </p>
      <p className={styles.gatePreview}>{stripHtml(post.content).slice(0, 220)}…</p>
      <div className={styles.gateActions}>
        {post.visibility === 'PAID' && (
          <Button variant="primary" onClick={onRequestPurchase} disabled={purchasing}>
            {purchasing ? 'Requesting…' : `Unlock for ${post.price} ${post.currency || 'USD'}`}
          </Button>
        )}
        <Button variant="ghost" onClick={onSubscribe} disabled={subscribing}>{subscribing ? 'Subscribing…' : '🔔 Subscribe to blog'}</Button>
      </div>
    </div>
  )
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function BlogPostClient({ params }: { params: Promise<{ slug: string; postSlug: string }> }) {
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolved, setResolved] = useState<{ slug: string; postSlug: string } | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    params.then((p) => { if (!cancelled) setResolved(p) })
    return () => { cancelled = true }
  }, [params])

  const load = useCallback(async () => {
    if (!resolved) return
    const res = await fetch(`/api/blog/posts/by-slug/${resolved.postSlug}?blogSlug=${resolved.slug}`)
      .catch(() => null)
    if (!res || !res.ok) {
      // Fallback: fetch via detail API and find by slug
      try {
        const detailRes = await fetch(`/api/blog/${resolved.slug}`)
        const detailData = await detailRes.json()
        const found = detailData?.data?.posts?.find((p: { slug: string }) => p.slug === resolved.postSlug)
        if (found) {
          const postRes = await fetch(`/api/blog/posts/${found.id}`)
          const postData = await postRes.json()
          setPost(postData.data)
          setLiked(!!postData.data.liked)
          setLikeCount(postData.data.likeCount)
        }
      } catch { /* not found */ }
      setLoading(false)
      return
    }
    const data = await res.json()
    if (data?.data) {
      setPost(data.data)
      setLiked(!!data.data.liked)
      setLikeCount(data.data.likeCount)
    }
    setLoading(false)
  }, [resolved])

  useEffect(() => { void load() }, [load])

  const toggleLike = async () => {
    if (!post || !session) {
      error('Sign in to like posts')
      return
    }
    const next = !liked
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))
    try {
      const res = await fetch(`/api/blog/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: next }),
      })
      if (!res.ok) {
        setLiked(!next)
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
        error('Failed to update like')
      }
    } catch {
      setLiked(!next)
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
      error('Failed to update like')
    }
  }

  const requestPurchase = async () => {
    if (!post) return
    setPurchasing(true)
    try {
      const res = await fetch(`/api/blog/posts/${post.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        success('Purchase requested — the author will unlock once payment is confirmed.')
        await load()
      } else {
        error(data?.error || 'Failed to request purchase')
      }
    } catch {
      error('Failed to request purchase')
    } finally {
      setPurchasing(false)
    }
  }

  const subscribe = async () => {
    if (!resolved) return
    setSubscribing(true)
    try {
      const res = await fetch(`/api/blog/${resolved.slug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'FREE' }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        success(data?.data?.status === 'ACTIVE' ? 'Subscribed! Paid posts may still require a paid tier.' : 'Subscription request submitted.')
        await load()
      } else {
        error(data?.error || 'Failed to subscribe')
      }
    } catch {
      error('Failed to subscribe')
    } finally {
      setSubscribing(false)
    }
  }

  if (loading) {
    return <div className={styles.page}><Skeleton height={300} /><Skeleton height={120} /><Skeleton height={240} /></div>
  }

  if (!post) {
    return (
      <div className={styles.page}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blogs', href: '/blogs' }, { label: 'Post' }]} />
        <div className={styles.notFound}>
          <h2>Post not found</h2>
          <Link href="/blogs">← Back to blogs</Link>
        </div>
      </div>
    )
  }

  const isHtml = post.content.trim().startsWith('<')

  return (
    <div className={styles.page}>
      <div className={styles.postBreadcrumbs}>
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Blogs', href: '/blogs' },
          { label: post.blog.blogName || 'Blog', href: `/blog/${post.blog.blogSlug}` },
          { label: post.title.slice(0, 40) },
        ]} />
      </div>

      <article className={styles.article}>
        {post.coverImage && (
          <div className={styles.coverImage}>
            <img src={post.coverImage} alt="" />
          </div>
        )}

        <header className={styles.postHeader}>
          <div className={styles.badges}>
            <span className={styles.typeBadge}>{VISIBILITY_LABELS[post.visibility]?.icon} {VISIBILITY_LABELS[post.visibility]?.label || post.visibility}</span>
            {post.publishedAt && <span className={styles.postDate}>{new Date(post.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
          </div>
          <h1>{post.title}</h1>
          {post.excerpt && <p className={styles.lede}>{post.excerpt}</p>}

          <div className={styles.byline}>
            <Link href={`/blog/${post.blog.blogSlug}`} className={styles.author}>
              {post.blog.blogImage ? (
                <Image src={post.blog.blogImage} alt="" width={36} height={36} className={styles.authorAvatar} />
              ) : (
                <span className={styles.authorAvatarPlaceholder}>{(post.blog.blogName || 'B')[0].toUpperCase()}</span>
              )}
              <span>{post.blog.blogName || post.blog.name || 'Author'}</span>
            </Link>
          </div>
        </header>

        {post.locked ? (
          <AccessGate post={post} onRequestPurchase={requestPurchase} onSubscribe={subscribe} purchasing={purchasing} subscribing={subscribing} />
        ) : (
          <div className={styles.body}>
            {isHtml ? (
              <div className={styles.htmlBody} dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              post.content.split('\n').map((line, i) => <p key={i}>{line}</p>)
            )}
          </div>
        )}

        {post.tags && (() => {
          try {
            const tags = JSON.parse(post.tags)
            if (!Array.isArray(tags) || tags.length === 0) return null
            return (
              <div className={styles.tags}>
                {tags.map((t: string) => (
                  <Link key={t} href={`/hashtags/${encodeURIComponent(t.replace(/^#/, ''))}`} className={styles.tag}>#{t.replace(/^#/, '')}</Link>
                ))}
              </div>
            )
          } catch { return null }
        })()}

        <footer className={styles.postFooter}>
          <button className={styles.likeBtn} onClick={toggleLike} disabled={!session}>
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          <span className={styles.viewCount}>👁 {post.viewCount}</span>
          <a className={styles.rssLink} href={`/blog/${post.blog.blogSlug}/feed.xml`} target="_blank" rel="noopener noreferrer">📡 RSS</a>
        </footer>

        <div className={styles.authorBox}>
          <Link href={`/blog/${post.blog.blogSlug}`} className={styles.authorBoxLink}>
            {post.blog.blogImage ? (
              <Image src={post.blog.blogImage} alt="" width={48} height={48} className={styles.authorAvatar} />
            ) : (
              <span className={styles.authorAvatarPlaceholderLg}>{(post.blog.blogName || 'B')[0].toUpperCase()}</span>
            )}
            <div>
              <strong>{post.blog.blogName || post.blog.name || 'Author'}</strong>
              {post.blog.blogTagline && <p>{post.blog.blogTagline}</p>}
            </div>
          </Link>
          <Link href={`/blog/${post.blog.blogSlug}`} className={styles.allPostsLink}>View all posts →</Link>
        </div>
      </article>
    </div>
  )
}