'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import LinkItemModal from './LinkItemModal'
import styles from './LinkedItemsSection.module.css'

interface LinkedItem {
  type: string
  id: string
  title: string
  url: string
}

interface BacklinkRecord {
  id: string
  sourceType: string
  sourceId: string
  targetType: string
  targetId: string
  relationType: string
  createdAt: string
  direction?: 'incoming' | 'outgoing'
}

const TYPE_ICONS: Record<string, string> = {
  PLAN: '📋',
  PRODUCT: '🛒',
  EVENT: '📅',
  REQUEST: '🙋',
  SERVICE: '🔧',
  GROUP: '👥',
  POST: '📝',
  SCHOOLCONTENT: '📚',
  SHOP: '🏪',
  SCHOOL: '🏫',
}

const TYPE_LABELS: Record<string, string> = {
  PLAN: 'Plan',
  PRODUCT: 'Product',
  EVENT: 'Event',
  REQUEST: 'Request',
  SERVICE: 'Service',
  GROUP: 'Group',
  POST: 'Post',
  SCHOOLCONTENT: 'School Content',
  SHOP: 'Shop',
  SCHOOL: 'School',
}

const RELATION_LABELS: Record<string, string> = {
  REFERENCES: 'References',
  CONTAINS: 'Contains',
  RELATES_TO: 'Relates To',
  PROMOTES: 'Promotes',
}

interface LinkedItemsSectionProps {
  entityType: string
  entityId: string
  currentUserId?: string | null
}

export default function LinkedItemsSection({
  entityType,
  entityId,
  currentUserId,
}: LinkedItemsSectionProps) {
  const [items, setItems] = useState<LinkedItem[]>([])
  const [backlinks, setBacklinks] = useState<BacklinkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!entityType || !entityId) {
      setLoading(false)
      return
    }

    try {
      const [refRes, blRes] = await Promise.all([
        fetch(`/api/reference?type=${entityType}&id=${entityId}`),
        fetch(`/api/backlinks?type=${entityType}&id=${entityId}`),
      ])

      if (refRes.ok) {
        const data = await refRes.json()
        setItems(data.items || [])
      }

      if (blRes.ok) {
        const data = await blRes.json()
        setBacklinks(data.backlinks || [])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleUnlink = async (bl: BacklinkRecord) => {
    setUnlinking(bl.id)
    try {
      const res = await fetch('/api/reference', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: bl.sourceType,
          sourceId: bl.sourceId,
          targetType: bl.targetType,
          targetId: bl.targetId,
        }),
      })

      if (res.ok) {
        setBacklinks(prev => prev.filter(b => b.id !== bl.id))
        setItems(prev => prev.filter(
          i => !(i.type === (bl.direction === 'outgoing' ? bl.targetType : bl.sourceType) &&
                i.id === (bl.direction === 'outgoing' ? bl.targetId : bl.sourceId))
        ))
      }
    } catch {
    } finally {
      setUnlinking(null)
    }
  }

  const outgoing = backlinks.filter(b => b.sourceType === entityType && b.sourceId === entityId)
  const incoming = backlinks.filter(b => b.targetType === entityType && b.targetId === entityId)

  if (loading) return null
  if (items.length === 0 && outgoing.length === 0 && incoming.length === 0) return null

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>🔗 Linked Items</h3>
        <button
          className={styles.addBtn}
          onClick={() => setShowLinkModal(true)}
        >
          + Link Item
        </button>
      </div>

      <LinkItemModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        sourceType={entityType}
        sourceId={entityId}
        onLinked={fetchItems}
      />

      {outgoing.length > 0 && (
        <div className={styles.subsection}>
          <h4 className={styles.subTitle}>Links from this</h4>
          <div className={styles.list}>
            {outgoing.map(bl => (
              <div key={bl.id} className={styles.card}>
                <Link href={(() => {
                  const labels: Record<string, string> = {
                    PLAN: '/plans/', PRODUCT: '/products/', EVENT: '/events/',
                    REQUEST: '/requests/', SERVICE: '/services/', GROUP: '/groups/',
                    POST: '/posts/', SCHOOLCONTENT: '/school/content/',
                    SHOP: '/shop/', SCHOOL: '/school/',
                  }
                  return (labels[bl.targetType] || '/') + bl.targetId
                })()} className={styles.cardLink}>
                  <span className={styles.icon}>{TYPE_ICONS[bl.targetType] || '🔗'}</span>
                  <div className={styles.info}>
                    <span className={styles.itemTitle}>
                      {items.find(i => i.type === bl.targetType && i.id === bl.targetId)?.title || bl.targetId}
                    </span>
                    <span className={styles.meta}>
                      {TYPE_LABELS[bl.targetType] || bl.targetType}
                      {' · '}
                      <span className={styles.relation}>{RELATION_LABELS[bl.relationType] || bl.relationType}</span>
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => handleUnlink(bl)}
                  disabled={unlinking === bl.id}
                  className={styles.unlinkBtn}
                  title="Remove link"
                >
                  {unlinking === bl.id ? '...' : '✕'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div className={styles.subsection}>
          <h4 className={styles.subTitle}>Linked from others</h4>
          <div className={styles.list}>
            {incoming.map(bl => (
              <div key={bl.id} className={styles.card}>
                <Link href={(() => {
                  const labels: Record<string, string> = {
                    PLAN: '/plans/', PRODUCT: '/products/', EVENT: '/events/',
                    REQUEST: '/requests/', SERVICE: '/services/', GROUP: '/groups/',
                    POST: '/posts/', SCHOOLCONTENT: '/school/content/',
                    SHOP: '/shop/', SCHOOL: '/school/',
                  }
                  return (labels[bl.sourceType] || '/') + bl.sourceId
                })()} className={styles.cardLink}>
                  <span className={styles.icon}>{TYPE_ICONS[bl.sourceType] || '🔗'}</span>
                  <div className={styles.info}>
                    <span className={styles.itemTitle}>
                      {items.find(i => i.type === bl.sourceType && i.id === bl.sourceId)?.title || bl.sourceId}
                    </span>
                    <span className={styles.meta}>
                      {TYPE_LABELS[bl.sourceType] || bl.sourceType}
                      {' · '}
                      <span className={styles.relation}>{RELATION_LABELS[bl.relationType] || bl.relationType}</span>
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
