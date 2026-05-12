'use client'

import Link from 'next/link'
import Image from 'next/image'
import { renderMentions } from '@/lib/mentions'
import { linkHashtags } from '@/lib/hashtags'

interface FeedPost {
  id: string
  content: string
  images: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
  sourceType: 'POST' | 'GROUPPOST' | 'FORUMPOST'
  groupName?: string
  groupId?: string
}

function renderContent(text: string): string {
  const userMap = new Map<string, string>()
  return renderMentions(linkHashtags(text), userMap)
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
  const imageList = getImages(post.images)

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '16px',
      transition: 'box-shadow 0.2s, transform 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Link href={`/profile/${post.user.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-tertiary)', position: 'relative', flexShrink: 0 }}>
            {post.user.image ? (
              <Image src={post.user.image} alt="" fill style={{ objectFit: 'cover' }} />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '0.875rem' }}>
                {post.user.name?.[0] || 'U'}
              </span>
            )}
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{post.user.name || 'Unknown'}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '8px' }}>
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {post.sourceType === 'GROUPPOST' && post.groupName && (
            <Link href={`/groups/${post.groupId}`} style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none'
            }}>
              {post.groupName}
            </Link>
          )}
          {post.sourceType === 'FORUMPOST' && (
            <span style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'var(--accent)',
              color: '#fff'
            }}>
              Forum
            </span>
          )}
        </div>
      </div>

      <div
        style={{ lineHeight: 1.6, marginBottom: imageList.length > 0 ? '12px' : 0 }}
        dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
      />

      {imageList.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: imageList.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px',
          marginTop: '12px'
        }}>
          {imageList.map((url, i) => (
            <div key={i} style={{
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              paddingTop: imageList.length === 1 ? '50%' : '75%',
              background: 'var(--bg-tertiary)'
            }}>
              <img
                src={url}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
