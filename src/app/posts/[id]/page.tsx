'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import HashtagText from '@/components/HashtagText'
import EntityActions from '@/components/EntityActions'
import ReplySection from '@/components/ReplySection'
import SharedItemCard from '@/components/SharedItemCard'
import ViewCount from '@/components/ViewCount'
import { getUserProfileUrl } from '@/lib/utils'
import { useRecordView } from '@/hooks/useRecordView'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import Breadcrumbs from '@/components/Breadcrumbs'
import PinToBoardButton from '@/components/PinToBoardButton'
import Loading from '@/components/Loading'
import styles from '../page.module.css'

interface PostData {
  id: string
  content: string
  imageUrl: string | null
  images: string | null
  createdAt: string
  userId: string
  likes: number
  viewCount?: number
  repostCount?: number
  reposted?: boolean
  context?: string | null
  referenceType?: string | null
  referenceId?: string | null
  referenceTitle?: string | null
  user: {
    id: string
    name: string | null
    image: string | null
    username: string | null
  }
}

export default function PostPage() {
  const params = useParams()
  const postId = params.id as string
  const [post, setPost] = useState<PostData | null>(null)
  const [likes, setLikes] = useState(0)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandReply, setExpandReply] = useState(false)

  useEffect(() => {
    if (!postId) return
    fetch(`/api/posts/${postId}`)
      .then(r => r.json())
      .then(data => {
        setPost(data.post)
        setLikes(data.likes ?? data.post.likes ?? 0)
        setLiked(data.liked ?? false)
      })
      .catch(() => setError('Failed to load post'))
      .finally(() => setLoading(false))
  }, [postId])

  useRecordView('post', post?.id || '')

  if (loading) {
    return <Loading size="medium" />
  }

  if (error || !post) {
    return (
      <div className={styles.errorState}>
        <Link href="/dashboard/feed" className={styles.backLink}>← Back to Feed</Link>
        <p className={styles.errorText}>{error || 'Post not found'}</p>
      </div>
    )
  }

  const imageList = post.images ? (() => { try { const p = JSON.parse(post.images); return Array.isArray(p) ? p : [] } catch { return [] } })() : []
  const isRepost = post.context === 'REPOST'

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Post' }]} />
      <nav className={styles.nav}>
        <Link href="/dashboard/feed" className={styles.backLink}>← Back to Feed</Link>
      </nav>

      <div className={styles.card}>
        {isRepost ? (
          <>
            <div className={styles.repostHeader}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <span>
                Reposted by <strong>{post.user.name || 'Unknown'}</strong>
                {post.user.username && <span className={styles.repostUser}> @{post.user.username}</span>}
              </span>
              <span className={styles.repostMeta}>
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
            {post.referenceType && post.referenceId && (
              <SharedItemCard
                referenceType={post.referenceType}
                referenceId={post.referenceId}
                referenceTitle={post.referenceTitle}
              />
            )}
          </>
        ) : (
          <>
          <div className={styles.userRow}>
            <Link href={getUserProfileUrl({ id: post.user.id, username: post.user.username })} className={styles.userLink}>
              <div className={styles.avatarWrap}>
                {post.user.image ? (
                  <Image src={post.user.image} alt="" fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.avatarInitial}>{post.user.name?.[0] || 'U'}</div>
                )}
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{post.user.name || 'Unknown'}</div>
                <div className={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()} <ViewCount count={post.viewCount || 0} /></div>
              </div>
            </Link>
          </div>

          <div className={`${styles.contentBody} ${imageList.length > 0 ? styles.hasImages : ''}`}>
            <HashtagText text={post.content} />
          </div>

          {imageList.length > 0 && (
            <div className={styles.imageGrid}>
              {imageList.map((url, i) => (
                <img key={i} src={url} alt="" loading="lazy" />
              ))}
            </div>
          )}

          {post.referenceType && post.referenceId && (
            <SharedItemCard
              referenceType={post.referenceType}
              referenceId={post.referenceId}
              referenceTitle={post.referenceTitle}
            />
          )}
          </>
        )}

        <div className={styles.actions}>
          <EntityActions
            entityType="POST"
            entityId={post.id}
            title={post.content?.slice(0, 100) || 'Post'}
            authorId={post.userId}
            initialLikes={likes}
            liked={liked}
            repostCount={post.repostCount || 0}
            reposted={post.reposted || false}
            variant="full"
          />
          <PinToBoardButton entityType="POST" entityId={post.id} entityTitle={post.content?.slice(0, 50) || 'Post'} />
        </div>
      </div>

      <ReplySection postId={post.id} postAuthorId={post.userId} expandReply={expandReply} />

      <LinkedItemsSection
        entityType="POST"
        entityId={post.id}
      />
    </div>
  )
}
