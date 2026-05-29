'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import HashtagText from '@/components/HashtagText'
import styles from './SharedItemCard.module.css'

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

const TYPE_ICONS: Record<string, string> = {
  PRODUCT: '🛒', SERVICE: '🔧', EVENT: '📅', REQUEST: '📋', PLAN: '📐', POST: '🔁',
  SCHOOLCONTENT: '📖', FORUMPOST: '💬', GROUP: '👥',
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
    PRODUCT: 'products', SERVICE: 'services', EVENT: 'events',
    REQUEST: 'requests', PLAN: 'plans', SCHOOLCONTENT: 'school',
    FORUMPOST: 'community/forum', GROUP: 'groups',
  }

  const route = typeToRoute[referenceType]
  const href = route ? `/${route}/${referenceId}` : '#'

  if (referenceType === 'POST') {
    const imageList = getImages(item?.images || null)
    return (
      <Link href={`/posts/${referenceId}`} className={styles.postLink}>
        <div className={styles.postCard}>
          {loading ? (
            <div className={styles.loading}>Loading post...</div>
          ) : item ? (
            <div className={styles.postCardBody}>
              <div className={styles.repostBadge}>🔁 Repost</div>
              <div className={styles.postHeader}>
                <div className={styles.postAvatar}>
                  {item.user?.image ? (
                    <Image src={item.user.image} alt="" width={24} height={24} style={{ objectFit: 'cover' }} />
                  ) : (
                    <span>{item.user?.name?.[0] || 'U'}</span>
                  )}
                </div>
                <span className={styles.postAuthor}>{item.user?.name || 'Unknown'}</span>
                {item.user?.username && (
                  <span className={styles.postUsername}>@{item.user.username}</span>
                )}
              </div>
              {item.content && (
                <div className={styles.postContent}>
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
            </div>
          ) : (
            <div className={styles.notFound}>Post not found</div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link href={href} className={styles.cardLink}>
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
          {item?.image ? (
            <img src={item.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div className={styles.cardIcon}>
              {TYPE_ICONS[referenceType] || '📎'}
            </div>
          )}
          <div className={styles.cardInfo}>
            <div className={styles.cardType}>{TYPE_ICONS[referenceType]} {referenceType}</div>
            <div className={styles.cardTitle}>
              {loading ? 'Loading...' : (item?.title || referenceType)}
            </div>
          </div>
          <span className={styles.cardArrow}>→</span>
        </div>
      </div>
    </Link>
  )
}
