'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './RelatedItems.module.css'

interface RelatedItem {
  type: string
  id: string
  title: string
  url: string
}

interface RelatedItemsProps {
  entityType: string
  entityId: string
  maxItems?: number
}

const TYPE_ICONS: Record<string, string> = {
  PLAN: '📋',
  PRODUCT: '🛒',
  EVENT: '📅',
  REQUEST: '🙋',
  SERVICE: '🔧',
  GROUP: '👥',
  POST: '📝',
}

const TYPE_LABELS: Record<string, string> = {
  PLAN: 'Plan',
  PRODUCT: 'Product',
  EVENT: 'Event',
  REQUEST: 'Request',
  SERVICE: 'Service',
  GROUP: 'Group',
  POST: 'Post',
}

export default function RelatedItems({ entityType, entityId, maxItems = 5 }: RelatedItemsProps) {
  const [items, setItems] = useState<RelatedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityType || !entityId) {
      setLoading(false)
      return
    }
    fetch(`/api/reference?type=${entityType}&id=${entityId}`)
      .then(res => res.ok ? res.json() : { items: [] })
      .then(data => {
        setItems((data.items || []).slice(0, maxItems))
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [entityType, entityId, maxItems])

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className={styles.section}>
      <h3 className={styles.title}>🔗 Related Items</h3>
      <div className={styles.list}>
        {items.map(item => (
          <Link key={`${item.type}-${item.id}`} href={item.url} className={styles.card}>
            <span className={styles.icon}>{TYPE_ICONS[item.type] || '🔗'}</span>
            <div className={styles.info}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemType}>{TYPE_LABELS[item.type] || item.type}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
