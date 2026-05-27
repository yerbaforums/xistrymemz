'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import styles from './ShareToPostModal.module.css'

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Share to Post</h3>

        <div className={styles.preview}>
          {referenceImage && (
            <img src={referenceImage} alt="" className={styles.previewImage} />
          )}
          <div>
            <div className={styles.previewType}>{referenceType}</div>
            <div className={styles.previewTitle}>{referenceTitle}</div>
          </div>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment (optional)..."
          rows={3}
          className={styles.textarea}
        />

        <div className={styles.destinationSection}>
          <div className={styles.destinationLabel}>Post to:</div>
          <div className={styles.destinationRow}>
            {DESTINATIONS.map(d => {
              const disabled = (d.key === 'SHOP' && !hasShop) || (d.key === 'SCHOOL' && !hasSchool)
              return (
                <button
                  key={d.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDestination(d.key)}
                  className={`${styles.destinationBtn} ${destination === d.key ? styles.destinationBtnActive : ''}`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleShare} disabled={posting} className={styles.shareBtn}>
            {posting ? 'Posting...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  )
}
