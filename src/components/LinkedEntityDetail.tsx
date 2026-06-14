'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import styles from './LinkedEntityDetail.module.css'

interface EntityDetail {
  title?: string
  price?: number | null
  imageUrl?: string | null
  location?: string | null
  eventDate?: string | null
  duration?: number | null
  category?: string | null
  status?: string | null
  slug?: string | null
}

const ENTITY_ROUTES: Record<string, string> = {
  PRODUCT: '/api/products',
  EVENT: '/api/events',
  SERVICE: '/api/services',
  PROJECT: '/api/projects',
  GROUP: '/api/groups',
  REQUEST: '/api/requests',
  SHOP: '/api/shops',
  POST: '/api/posts',
  SCHOOL_CONTENT: '/api/school-contents',
}

const ENTITY_LIST_ROUTES: Record<string, string> = {
  PRODUCT: '/products',
  EVENT: '/events',
  SERVICE: '/services',
  PROJECT: '/api/projects',
  GROUP: '/groups',
  REQUEST: '/requests',
  SHOP: '/shops',
  POST: '/posts',
  SCHOOL_CONTENT: '/school/content',
}

export default function LinkedEntityDetail({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [detail, setDetail] = useState<EntityDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityType || !entityId) { setLoading(false); return }
    const route = ENTITY_ROUTES[entityType]
    if (!route) { setLoading(false); return }

    setLoading(true)
    fetch(`${route}/${entityId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) { setDetail(null); return }
        const d = data.event || data.product || data.service || data.project || data.group || data.request || data
        setDetail({
          title: d.title || d.shopName || d.name,
          price: d.price ?? d.rate ?? null,
          imageUrl: d.imageUrl || d.image || d.shopImage,
          location: d.location || d.city,
          eventDate: d.eventDate,
          duration: d.duration,
          category: d.category || d.serviceCategory,
          status: d.status || d.verificationLevel,
          slug: d.slug,
        })
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [entityType, entityId])

  if (loading) return <div className={styles.loading}><Skeleton width="100%" height="3rem" /></div>
  if (!detail) return null

  const listRoute = ENTITY_LIST_ROUTES[entityType]
  const href = entityType === 'USER'
    ? `/profile/${entityId}`
    : detail.slug
      ? entityType === 'SHOP' ? `/shop/${detail.slug}` : entityType === 'GROUP' ? `/groups/${entityId}` : `${listRoute}/${detail.slug}`
      : `${listRoute}/${entityId}`

  return (
    <Link href={href} className={styles.card} target="_blank" rel="noopener noreferrer">
      {detail.imageUrl && (
        <img src={detail.imageUrl} alt="" className={styles.image} />
      )}
      <div className={styles.info}>
        <div className={styles.title}>{detail.title || `${entityType.replace('_', ' ')}`}</div>
        <div className={styles.meta}>
          {detail.price != null && <span className={styles.price}>${Number(detail.price).toFixed(2)}</span>}
          {detail.eventDate && <span>📅 {new Date(detail.eventDate).toLocaleDateString()}</span>}
          {detail.location && <span>📍 {detail.location}</span>}
          {detail.duration && <span>⏱ {detail.duration}min</span>}
          {detail.category && <span className={styles.tag}>{detail.category}</span>}
          {detail.status && <span className={styles.tag}>{detail.status}</span>}
        </div>
      </div>
      <span className={styles.arrow}>→</span>
    </Link>
  )
}
