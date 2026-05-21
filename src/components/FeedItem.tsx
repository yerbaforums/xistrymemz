'use client'

import Link from 'next/link'
import Image from 'next/image'
import HashtagText from '@/components/HashtagText'
import PostActions from '@/components/PostActions'
import SharedItemCard from '@/components/SharedItemCard'
import ReplySection from '@/components/ReplySection'
import { useState } from 'react'
import { getUserProfileUrl } from '@/lib/utils'
import styles from './FeedItem.module.css'

interface FeedPost {
  id: string
  content: string
  images: string | null
  likes?: number
  liked?: boolean
  replyCount?: number
  userId?: string
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
    username?: string | null
  }
  sourceType: 'POST' | 'GROUPPOST' | 'FORUMPOST'
  context?: string | null
  groupName?: string
  groupId?: string
  referenceType?: string | null
  referenceId?: string | null
  referenceTitle?: string | null
}

const CONTEXT_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  WALL: { label: 'Wall', icon: '📝', className: 'contextWall' },
  SHOP: { label: 'Shop', icon: '🏪', className: 'contextShop' },
  SCHOOL: { label: 'School', icon: '📚', className: 'contextSchool' },
  PROFILE: { label: 'Post', icon: '👤', className: 'contextProfile' },
  GROUPPOST: { label: 'Group', icon: '👥', className: 'contextGroup' },
  FORUMPOST: { label: 'Forum', icon: '💬', className: 'contextForum' },
}

function getImages(images: string | null): string[] {
  if (!images) return []
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function FeedItem({ post }: { post: FeedPost }) {
  const [showReplies, setShowReplies] = useState(false)
  const imageList = getImages(post.images)
  const contextKey = post.context || post.sourceType || 'PROFILE'
  const ctxConfig = CONTEXT_CONFIG[contextKey] || CONTEXT_CONFIG.PROFILE
  const borderStyle = contextKey === 'GROUPPOST' || contextKey === 'FORUMPOST'
    ? {}
    : { borderLeft: `4px solid var(--context-${contextKey.toLowerCase()})` }

  return (
    <div className={`${styles.item} ${styles[ctxConfig.className] || ''}`} style={borderStyle}>
      <div className={styles.header}>
        <Link href={getUserProfileUrl(post.user)} className={styles.userLink}>
          <div className={styles.avatar}>
            {post.user.image ? (
              <Image src={post.user.image} alt="" fill style={{ objectFit: 'cover' }} />
            ) : (
              <span className={styles.avatarFallback}>
                {post.user.name?.[0] || 'U'}
              </span>
            )}
          </div>
          <div>
            <span className={styles.userName}>{post.user.name || 'Unknown'}</span>
            <span className={styles.date}>
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </Link>
        <div className={styles.badges}>
          {post.sourceType !== 'POST' && post.sourceType === 'GROUPPOST' && post.groupName && (
            <Link href={`/groups/${post.groupId}`} className={styles.badge}>
              {post.groupName}
            </Link>
          )}
          {post.sourceType !== 'POST' && post.sourceType === 'FORUMPOST' && (
            <span className={styles.badge}>Forum</span>
          )}
          {post.context && post.context !== 'PROFILE' && post.sourceType === 'POST' && (
            <span className={`${styles.contextBadge} ${styles[`ctx${post.context}`] || ''}`}>
              {ctxConfig.icon} {ctxConfig.label}
            </span>
          )}
        </div>
      </div>

      <div
        style={{ lineHeight: 1.6, marginBottom: imageList.length > 0 ? '12px' : 0 }}
      >
        <HashtagText text={post.content} />
      </div>

      {imageList.length > 0 && (
        <div className={`${styles.imageGrid} ${imageList.length === 1 ? styles.singleImage : ''}`}>
          {imageList.map((url, i) => (
            <div key={i} className={styles.imageWrapper}>
              <img
                src={url}
                alt=""
                className={styles.image}
                loading="lazy"
              />
            </div>
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
      {post.sourceType === 'POST' && post.userId && (
        <div style={{ marginTop: 8 }}>
          <PostActions
            postId={post.id}
            postAuthorId={post.userId}
            initialLikes={post.likes || 0}
            liked={post.liked}
            showTip={true}
            replyCount={post.replyCount ?? 0}
            onReply={() => setShowReplies(!showReplies)}
          />
          <ReplySection postId={post.id} postAuthorId={post.userId} expandReply={showReplies} />
        </div>
      )}
    </div>
  )
}
