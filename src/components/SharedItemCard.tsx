'use client'

import { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import IpfsImage from '@/components/IpfsImage'
import Avatar from '@/components/Avatar'
import Skeleton from '@/components/Skeleton'
import HashtagText from '@/components/HashtagText'
import { getEntityIcon } from '@/lib/entity-icons'
import { buildReferenceHref, referenceTypeLabel } from '@/lib/reference-links'
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
  schoolSlug?: string | null
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

const SharedItemCard = memo(function SharedItemCard({ referenceType, referenceId, referenceTitle: cachedTitle }: SharedItemCardProps) {
  const [item, setItem] = useState<RefItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cachedTitle && referenceType !== 'POST' && referenceType !== 'SCHOOLCONTENT') {
      setItem({ title: cachedTitle, image: null })
      setLoading(false)
      return
    }
    fetch(`/api/reference/${referenceType}/${referenceId}`)
      .then(r => r.json())
      .then(data => {
        const result = data?.data?.item || data?.item
        if (result) setItem(result)
        else if (cachedTitle) setItem({ title: cachedTitle, image: null })
      })
      .catch(() => {
        if (cachedTitle) setItem({ title: cachedTitle, image: null })
      })
      .finally(() => setLoading(false))
  }, [referenceType, referenceId, cachedTitle])

  const href = buildReferenceHref(referenceType, referenceId, item?.schoolSlug)

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
                    <Avatar src={item.user.image} name={item.user?.name} size={24} />
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
                      <IpfsImage src={url} alt="" style={{ width: '100%', height: '100%' }} thumbWidth={512} />
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
            <IpfsImage src={item.image} alt="" style={{ width: 40, height: 40, borderRadius: 6 }} thumbWidth={256} />
          ) : (
            <div className={styles.cardIcon}>
              {getEntityIcon(referenceType) || '📎'}
            </div>
          )}
          <div className={styles.cardInfo}>
            <div className={styles.cardType}>{getEntityIcon(referenceType)} {referenceTypeLabel(referenceType)}</div>
            <div className={styles.cardTitle}>
              {loading ? <Skeleton width="60%" height="1rem" /> : (item?.title || referenceType)}
            </div>
          </div>
          <span className={styles.cardArrow}>→</span>
        </div>
      </div>
    </Link>
  )
})

export default SharedItemCard
