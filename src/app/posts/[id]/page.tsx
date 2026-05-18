'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import HashtagText from '@/components/HashtagText'
import PostActions from '@/components/PostActions'
import ReplySection from '@/components/ReplySection'
import SharedItemCard from '@/components/SharedItemCard'
import { getUserProfileUrl } from '@/lib/utils'

interface PostData {
  id: string
  content: string
  imageUrl: string | null
  images: string | null
  createdAt: string
  userId: string
  likes: number
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

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading post...</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <Link href="/dashboard/feed" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Feed</Link>
        <p style={{ color: 'var(--text-secondary)', marginTop: 24 }}>{error || 'Post not found'}</p>
      </div>
    )
  }

  const imageList = post.images ? (() => { try { const p = JSON.parse(post.images); return Array.isArray(p) ? p : [] } catch { return [] } })() : []

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <nav style={{ marginBottom: 16 }}>
        <Link href="/dashboard/feed" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Feed</Link>
      </nav>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Link href={getUserProfileUrl({ id: post.user.id, username: post.user.username })} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-tertiary)', position: 'relative' }}>
              {post.user.image ? (
                <Image src={post.user.image} alt="" fill style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{post.user.name?.[0] || 'U'}</div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{post.user.name || 'Unknown'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(post.createdAt).toLocaleDateString()}</div>
            </div>
          </Link>
        </div>

        <div style={{ lineHeight: 1.6, marginBottom: imageList.length > 0 ? 12 : 0 }}>
          <HashtagText text={post.content} />
        </div>

        {imageList.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {imageList.map((url, i) => (
              <img key={i} src={url} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'cover' }} loading="lazy" />
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

        <div style={{ marginTop: 12 }}>
          <PostActions
            postId={post.id}
            postAuthorId={post.userId}
            initialLikes={likes}
            liked={liked}
            showTip={true}
            replyCount={0}
            onReply={() => setExpandReply(true)}
          />
        </div>
      </div>

      <ReplySection postId={post.id} postAuthorId={post.userId} expandReply={expandReply} />
    </div>
  )
}
