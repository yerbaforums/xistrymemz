'use client'

import { useState } from 'react'
import { useToast } from '@/context/ToastContext'
import styles from './MakeOfferModal.module.css'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface MakeOfferModalProps {
  isOpen: boolean
  onClose: () => void
  listingId: string
  listingTitle: string
  listingType: 'PRODUCT' | 'REQUEST'
  listingOwnerName?: string
}

export function MakeOfferModal({ isOpen, onClose, listingId, listingTitle, listingType, listingOwnerName }: MakeOfferModalProps) {
  const { success, error, info } = useToast()
  const modalRef = useFocusTrap(isOpen, onClose)
  const [offeredItem, setOfferedItem] = useState('')
  const [offeredValue, setOfferedValue] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offeredItem.trim()) {
      error('Please describe the item you are offering')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerType: 'MAKE_OFFER',
          listingType,
          listingId,
          listingTitle,
          offeredItem: offeredItem.trim(),
          offeredValue: offeredValue ? parseFloat(offeredValue) : undefined,
          message: message.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        success('Offer sent successfully!')
        setOfferedItem('')
        setOfferedValue('')
        setMessage('')
        onClose()
      } else {
        error(data.error || 'Failed to send offer')
      }
    } catch (err) {
      console.error(err)
      error('Failed to send offer')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} ref={modalRef}>
        <h2><span aria-hidden="true">🤝</span> Make a Barter Offer</h2>
        <p className={styles.desc}>
          Offer your item in exchange for this {listingType.toLowerCase()}
        </p>

        <div className={styles.listingInfo}>
          <strong>Listing:</strong> {listingTitle}
          {listingOwnerName && <span> by {listingOwnerName}</span>}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="offeredItem">What are you offering? *</label>
            <textarea
              id="offeredItem"
              value={offeredItem}
              onChange={e => setOfferedItem(e.target.value)}
              placeholder="Describe the item you want to offer (brand, condition, features, etc.)"
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="offeredValue">Estimated Value (optional)</label>
            <input
              id="offeredValue"
              type="number"
              min="0"
              step="0.01"
              value={offeredValue}
              onChange={e => setOfferedValue(e.target.value)}
              placeholder="0.00"
            />
            <span className={styles.hint}>This helps the owner understand the worth of your offer</span>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message (optional)</label>
            <textarea
              id="message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a message to the listing owner..."
              rows={2}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !offeredItem.trim()}
            >
              {loading ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}