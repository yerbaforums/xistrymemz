'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SharedItemCardProps {
  referenceType: string
  referenceId: string
  referenceTitle?: string | null
}

export default function SharedItemCard({ referenceType, referenceId, referenceTitle: cachedTitle }: SharedItemCardProps) {
  const [item, setItem] = useState<{ title: string; image: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cachedTitle) {
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

  const href = `/${referenceType.toLowerCase()}s/${referenceId}`

  const TYPE_ICONS: Record<string, string> = {
    PRODUCT: '🛒', EVENT: '📅', REQUEST: '📋', PLAN: '📐'
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
