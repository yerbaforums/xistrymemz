'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'

interface ShareToPostModalProps {
  isOpen: boolean
  onClose: () => void
  referenceType: 'PRODUCT' | 'SERVICE' | 'EVENT' | 'REQUEST' | 'PLAN' | 'SCHOOLCONTENT' | 'FORUMPOST' | 'GROUP' | 'SHOP' | 'SCHOOL'
  referenceId: string
  referenceTitle: string
  referenceImage?: string | null
}

const DESTINATIONS = [
  { key: 'PROFILE', label: 'My Profile' },
  { key: 'SHOP', label: 'My Shop' },
  { key: 'SCHOOL', label: 'My School' }
] as const

export default function ShareToPostModal({ isOpen, onClose, referenceType, referenceId, referenceTitle, referenceImage }: ShareToPostModalProps) {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [content, setContent] = useState('')
  const [destination, setDestination] = useState<'PROFILE' | 'SHOP' | 'SCHOOL'>('PROFILE')
  const [posting, setPosting] = useState(false)

  if (!isOpen) return null

  const handleShare = async () => {
    if (!session || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || `Shared a ${referenceType.toLowerCase()}`,
          context: destination,
          referenceType,
          referenceId,
          referenceTitle
        })
      })
      if (res.ok) {
        success('Posted!')
        setContent('')
        onClose()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to post')
      }
    } catch {
      toastError('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const hasShop = !!(session?.user as any)?.shopSlug
  const hasSchool = !!(session?.user as any)?.schoolSlug

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: 24,
        maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Share to Post</h3>

        <div style={{
          display: 'flex', gap: 12, padding: 12, borderRadius: 8,
          background: 'var(--bg-tertiary)', marginBottom: 16, alignItems: 'center'
        }}>
          {referenceImage && (
            <img src={referenceImage} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
          )}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{referenceType}</div>
            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{referenceTitle}</div>
          </div>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment (optional)..."
          rows={3}
          style={{
            width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)', resize: 'vertical',
            marginBottom: 12, fontSize: '0.9rem'
          }}
        />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Post to:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DESTINATIONS.map(d => {
              const disabled = (d.key === 'SHOP' && !hasShop) || (d.key === 'SCHOOL' && !hasSchool)
              return (
                <button
                  key={d.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDestination(d.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem',
                    border: `1px solid ${destination === d.key ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: destination === d.key ? 'var(--accent-primary)' : 'transparent',
                    color: destination === d.key ? '#fff' : disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={handleShare} disabled={posting}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: posting ? 'not-allowed' : 'pointer', opacity: posting ? 0.6 : 1 }}>
            {posting ? 'Posting...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  )
}
