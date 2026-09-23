'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import StarButton from '@/components/StarButton'
import PinToBoardButton from '@/components/PinToBoardButton'

interface Props {
  itemType: string
  itemId: string
  title: string
  image?: string | null
  detailUrl: string
  startProjectUrl?: string | null
  location?: string | null
  eventDate?: string | null
}

// Lightweight list actions: Star (Saved) + Pin + Plan + Request + Project.
// No EntityActions here (avoids view/count fan-out). Signed-out renders null.
export default function DirectoryCardActions({ itemType, itemId, title, image, detailUrl, startProjectUrl, location, eventDate }: Props) {
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [saving, setSaving] = useState(false)
  if (!session?.user) return null

  const pinType =
    itemType === 'PROFILE' ? 'USER' :
    itemType === 'PRODUCT' && detailUrl.startsWith('/products/') ? 'PRODUCT' :
    itemType

  // Deep-links kept plain: planning + request forms own their prefill via
  // ?fromRequest/?projectId; directory cards link without invented params.
  const planHref = '/dashboard/planning'
  const requestHref = itemType === 'REQUEST' ? detailUrl : '/requests/new'

  const saveEventToPlanner = async () => {
    if (!eventDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/user/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: null,
          startDate: eventDate,
          endDate: eventDate,
          location: location || null,
          sourceEventId: itemType === 'EVENT' ? itemId : null,
        }),
      })
      if (res.ok) success('Saved to My Planner')
      else error('Failed to save')
    } catch { error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div
      style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}
      onClick={e => e.stopPropagation()}
    >
      <span title="Star (Saved)" style={{ display: 'inline-flex' }}>
        <StarButton itemType={itemType} itemId={itemId} />
      </span>
      <PinToBoardButton
        entityType={pinType}
        entityId={itemId}
        entityTitle={title}
        entityImage={image || undefined}
        variant="secondary"
        label="Pin to Board"
      />
      <a href={planHref} onClick={e => e.stopPropagation()} title="Add to plan" style={{ fontSize: '0.75rem', textDecoration: 'none' }}>
        🗓️ Plan
      </a>
      {itemType === 'EVENT' && eventDate ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); saveEventToPlanner() }}
          disabled={saving}
          title="Save event to My Planner"
          style={{ fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {saving ? 'Saving...' : '📌 Save'}
        </button>
      ) : (
        <a href={requestHref} onClick={e => e.stopPropagation()} title={itemType === 'REQUEST' ? 'View request' : 'Make a request'} style={{ fontSize: '0.75rem', textDecoration: 'none' }}>
          📝 Request
        </a>
      )}
      {startProjectUrl && (
        <a href={startProjectUrl} onClick={e => e.stopPropagation()} title="Start a project from this" style={{ fontSize: '0.75rem', textDecoration: 'none' }}>
          🚀 Project
        </a>
      )}
    </div>
  )
}
