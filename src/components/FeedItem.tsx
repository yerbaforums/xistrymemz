'use client'

import Link from 'next/link'
import Image from 'next/image'
import HashtagText from '@/components/HashtagText'
import LinkPreview, { URL_REGEX } from '@/components/LinkPreview'
import EntityActions from '@/components/EntityActions'
import SharedItemCard from '@/components/SharedItemCard'
import ReplySection from '@/components/ReplySection'
import TranslateButton from '@/components/TranslateButton'
import ViewCount from '@/components/ViewCount'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
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
  viewCount?: number
  repostCount?: number
  reposted?: boolean
}

const CONTEXT_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  WALL: { label: 'Wall', icon: '📝', className: 'contextWall' },
  SHOP: { label: 'Shop', icon: '🏪', className: 'contextShop' },
  SCHOOL: { label: 'School', icon: '📚', className: 'contextSchool' },
  PROFILE: { label: 'Post', icon: '👤', className: 'contextProfile' },
  GROUPPOST: { label: 'Group', icon: '👥', className: 'contextGroup' },
  FORUMPOST: { label: 'Forum', icon: '💬', className: 'contextForum' },
  REPOST: { label: 'Repost', icon: '🔁', className: 'contextRepost' },
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
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const { data: session } = useSession()
  const imageList = getImages(post.images)
  const displayContent = post.content ? post.content.replace(URL_REGEX, '').trim() : ''
  const contextKey = post.context || post.sourceType || 'PROFILE'
  const ctxConfig = CONTEXT_CONFIG[contextKey] || CONTEXT_CONFIG.PROFILE
  const borderStyle = contextKey === 'GROUPPOST' || contextKey === 'FORUMPOST'
    ? {}
    : { borderLeft: `4px solid var(--context-${(CONTEXT_CONFIG[contextKey] ? contextKey : 'profile').toLowerCase()})` }
  const isRepost = contextKey === 'REPOST'

  return (
    <div className={`${styles.item} ${styles[ctxConfig.className] || ''}`} style={borderStyle}>
      {isRepost ? (
        <div style={{ paddingBottom: 4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', color: 'var(--text-secondary)',
            marginBottom: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span>
              Reposted by <strong>{post.user.name || 'Unknown'}</strong>
              {post.user.username && <span style={{ color: 'var(--text-muted)' }}> @{post.user.username}</span>}
            </span>
          </div>
          {post.referenceType && post.referenceId && (
            <SharedItemCard
              referenceType={post.referenceType}
              referenceId={post.referenceId}
              referenceTitle={post.referenceTitle}
            />
          )}
        </div>
      ) : (
        <>
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
            <ViewCount count={post.viewCount || 0} />
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
        {editing ? (
          <div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={async () => {
                try {
                  await fetch(`/api/posts/${post.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: editContent }),
                  })
                  setEditing(false)
                } catch {}
              }} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Save</button>
              <button onClick={() => { setEditing(false); setEditContent(post.content) }} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <Link href={`/posts/${post.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <HashtagText text={displayContent} mentionLinks />
          </Link>
        )}
        {!editing && <TranslateButton text={displayContent} />}
      </div>

      <LinkPreview text={post.content} />

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
      </>
      )}
      {post.sourceType === 'POST' && post.userId && (
        <div style={{ marginTop: 8 }}>
          <EntityActions
            entityType="POST"
            entityId={post.id}
            title={post.content?.slice(0, 100) || 'Post'}
            authorId={post.user?.id || post.userId}
            initialLikes={post.likes || 0}
            liked={post.liked || false}
            viewCount={post.viewCount || 0}
            replyCount={post.replyCount || 0}
            repostCount={post.repostCount || 0}
            reposted={post.reposted || false}
            variant="full"
          />
          <ReplySection postId={post.id} postAuthorId={post.userId} expandReply={showReplies} />
        </div>
      )}
    </div>
  )
}
