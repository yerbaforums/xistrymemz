'use client'

import { useState } from 'react'
import { useToast } from '@/context/ToastContext'
import styles from './MakeOfferModal.module.css'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import Button from '@/components/ui/Button'

interface CounterOfferModalProps {
  isOpen: boolean
  onClose: () => void
  originalOffer: {
    offeredItem: string
    offeredValue: number | null
    message: string | null
    makerName: string
  }
  listingTitle: string
  listingId: string
  offerId: string
}

export function CounterOfferModal({ isOpen, onClose, originalOffer, listingTitle, listingId, offerId }: CounterOfferModalProps) {
  const { success, error } = useToast()
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
      const res = await fetch(`/api/offers/${offerId}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeredItem: offeredItem.trim(),
          offeredValue: offeredValue ? parseFloat(offeredValue) : undefined,
          message: message.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        success('Counter offer sent!')
        setOfferedItem('')
        setOfferedValue('')
        setMessage('')
        onClose()
        window.location.reload()
      } else {
        error(data.error || 'Failed to send counter offer')
      }
    } catch (err) {
      console.error(err)
      error('Failed to send counter offer')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} ref={modalRef}>
        <h2><span aria-hidden="true">🔄</span> Counter Offer</h2>
        <p className={styles.desc}>
          Make a counter offer for {listingTitle}
        </p>

        <div className={styles.listingInfo}>
          <strong>Original offer from {originalOffer.makerName}:</strong> {originalOffer.offeredItem}
          {originalOffer.offeredValue && <span> (est. ${originalOffer.offeredValue.toFixed(2)})</span>}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="counterItem">What are you offering? *</label>
            <textarea
              id="counterItem"
              value={offeredItem}
              onChange={e => setOfferedItem(e.target.value)}
              placeholder="Describe the item you want to offer in your counter..."
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="counterValue">Estimated Value (optional)</label>
            <input
              id="counterValue"
              type="number"
              min="0"
              step="0.01"
              value={offeredValue}
              onChange={e => setOfferedValue(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="counterMessage">Message (optional)</label>
            <textarea
              id="counterMessage"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Explain your counter offer..."
              rows={2}
            />
          </div>

          <div className={styles.modalActions}>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !offeredItem.trim()}
            >
              {loading ? 'Sending...' : 'Send Counter Offer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
