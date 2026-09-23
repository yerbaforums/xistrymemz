'use client'

import { useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import PinToBoardButton from '@/components/PinToBoardButton'
import { useToast } from '@/context/ToastContext'

interface ExtraAction {
  label: string
  href: string
}

interface Props {
  open: boolean
  entityType: 'PROJECT' | 'REQUEST' | 'GROUP'
  entityId: string
  title: string
  image?: string | null
  detailUrl: string
  extraAction?: ExtraAction | null
  onClose: () => void
  onView: () => void
}

// Shared post-create sheet: Pin to Board / copy link / contextual next step / view.
// Dismissible — never blocks navigation (View is always available).
export default function NextStepsSheet({ open, entityType, entityId, title, image, detailUrl, extraAction, onClose, onView }: Props) {
  const { success, error } = useToast()
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}${detailUrl}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      success('Link copied!')
    } catch {
      error('Failed to copy')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="✅ Created! What's next?" size="sm">
      <p style={{ margin: '0 0 4px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Spread the word or keep building.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PinToBoardButton
          entityType={entityType}
          entityId={entityId}
          entityTitle={title}
          entityImage={image || undefined}
          variant="primary"
          label="Pin to Board"
        />
        <button type="button" onClick={copyLink} className="btn-ghost" style={{ textAlign: 'left' }}>
          {copied ? '✓ Link copied!' : '🔗 Copy link'}
        </button>
        {extraAction && (
          <Link href={extraAction.href} className="btn-ghost" style={{ textDecoration: 'none' }}>
            {extraAction.label}
          </Link>
        )}
        <button type="button" onClick={onView} className="btn-primary">
          👁️ View it →
        </button>
        <button type="button" onClick={onClose} className="btn-ghost" style={{ alignSelf: 'center', fontSize: '0.8rem' }}>
          Stay here
        </button>
      </div>
    </Modal>
  )
}
