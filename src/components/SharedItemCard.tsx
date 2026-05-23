'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import HashtagText from '@/components/HashtagText'

interface SharedItemCardProps {
  referenceType: string
  referenceId: string
  referenceTitle?: string | null
}

interface RefItem {
  id?: string
  title: string
  image: string | null
  type?: string
  content?: string
  images?: string | null
  user?: { id: string; name: string | null; image: string | null; username?: string | null }
  createdAt?: string
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

export default function SharedItemCard({ referenceType, referenceId, referenceTitle: cachedTitle }: SharedItemCardProps) {
  const [item, setItem] = useState<RefItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cachedTitle && referenceType !== 'POST') {
      setItem({ title: cachedTitle, image: null })
      setLoading(false)
      return
    }
    fetch(`/api/reference/${referenceType}/${referenceId}`)
      .then(r => r.json())
      .then(data => {
        if (data.item) setItem(data.item)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [referenceType, referenceId, cachedTitle])

  const typeToRoute: Record<string, string> = {
    PRODUCT: 'products',
    EVENT: 'events',
    REQUEST: 'requests',
    PLAN: 'plans',
    SCHOOLCONTENT: 'school',
    FORUMPOST: 'community/forum',
    GROUP: 'groups',
  }

  const TYPE_ICONS: Record<string, string> = {
    PRODUCT: '🛒', EVENT: '📅', REQUEST: '📋', PLAN: '📐', POST: '🔁',
    SCHOOLCONTENT: '📖', FORUMPOST: '💬', GROUP: '👥',
  }

  const route = typeToRoute[referenceType]
  const href = route ? `/${route}/${referenceId}` : '#'

  if (referenceType === 'POST') {
    const imageList = getImages(item?.images || null)
    return (
      <Link href={`/posts/${referenceId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div style={{
          padding: 12, borderRadius: 8,
          border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
          marginTop: 8,
        }}>
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading post...</div>
          ) : item ? (
            <>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                🔁 Repost
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                  {item.user?.image ? (
                    <Image src={item.user.image} alt="" width={24} height={24} style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.user?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.user?.name || 'Unknown'}
                </div>
                {item.user?.username && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    @{item.user.username}
                  </div>
                )}
              </div>
              {item.content && (
                <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: imageList.length > 0 ? 8 : 0 }}>
                  <HashtagText text={item.content} />
                </div>
              )}
              {imageList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: imageList.length === 1 ? '1fr' : '1fr 1fr', gap: 6 }}>
                  {imageList.map((url, i) => (
                    <div key={i} style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: imageList.length === 1 ? '16/9' : '1' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
              {item.createdAt && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Post not found</div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'flex', gap: 10, padding: 10, borderRadius: 8,
        border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
        marginTop: 8, alignItems: 'center'
      }}>
        {item?.image && (
          <img src={item.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
        )}
        {!item?.image && !loading && (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            {TYPE_ICONS[referenceType] || '📎'}
          </div>
        )}
        {loading && (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-secondary)', flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            {TYPE_ICONS[referenceType]} {referenceType}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loading ? 'Loading...' : (item?.title || referenceType)}
          </div>
        </div>
      </div>
    </Link>
  )
}
