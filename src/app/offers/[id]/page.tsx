'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'
import { CounterOfferModal } from '@/components/CounterOfferModal'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface BarterOffer {
  id: string
  status: string
  offerType: string
  listingType: string
  listingId: string
  listingTitle: string
  offeredItem: string
  offeredValue: number | null
  message: string | null
  createdAt: string
  parentOfferId: string | null
  maker: {
    id: string
    name: string | null
    location: string | null
    image: string | null
    shopSlug: string | null
  }
  receiver: {
    id: string
    name: string | null
    location: string | null
    image: string | null
    shopSlug: string | null
  }
  counterOffers?: BarterOffer[]
}

const STATUS_LABELS: Record<string, { label: string, color: string }> = {
  PENDING: { label: 'Pending', color: '#fa0' },
  ACCEPTED: { label: 'Accepted', color: '#2a2' },
  REJECTED: { label: 'Rejected', color: '#f44' },
  COUNTERED: { label: 'Countered', color: '#a6e' },
  WITHDRAWN: { label: 'Withdrawn', color: '#888' },
  COMPLETED: { label: 'Completed', color: '#2a2' },
}

export default function OfferDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { success, error } = useToast()
  const [offer, setOffer] = useState<BarterOffer | null>(null)
  const [counterOffers, setCounterOffers] = useState<BarterOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCounterModal, setShowCounterModal] = useState(false)

  useEffect(() => {
    if (!resolvedParams) return

    fetch(`/api/offers/${resolvedParams.id}`)
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({ error: 'Failed to fetch offer' })).then(data => {
            throw new Error(data.error || 'Request failed')
          })
        }
        return res.json()
      })
      .then(data => {
        setOffer(data)
        if (data.counterOffers) {
          setCounterOffers(data.counterOffers)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [resolvedParams])

  const isMaker = offer?.maker.id === session?.user?.id
  const isReceiver = offer?.receiver.id === session?.user?.id
  const canAccept = offer?.status === 'PENDING' && isReceiver
  const canWithdraw = offer?.status === 'PENDING' && isMaker
  const canCounter = offer?.status === 'PENDING' && isReceiver

  const handleAction = async (action: 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN') => {
    if (!offer) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })

      if (res.ok) {
        const updated = await res.json()
        setOffer(updated)
        if (action === 'ACCEPTED') {
          success('Offer accepted!')
        } else if (action === 'REJECTED') {
          error('Offer rejected')
        } else if (action === 'WITHDRAWN') {
          success('Offer withdrawn')
        }
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update offer')
      }
    } catch (err) {
      console.error(err)
      error('Failed to update offer')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!offer) {
    return <div className={styles.error}>Offer not found</div>
  }

  const statusInfo = STATUS_LABELS[offer.status] || { label: offer.status, color: '#888' }
  const otherUser = isMaker ? offer.receiver : offer.maker
  const messageUser = isMaker ? offer.receiver : offer.maker

  return (
    <ErrorBoundary>
      <div className={styles.page}>
      <Link href="/dashboard/offers" className={styles.backLink}>
        ← Back to Offers
      </Link>

      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Barter Offer</h1>
          <span 
            className={styles.status}
            style={{ backgroundColor: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
        </div>

        <div className={styles.section}>
          <h2>Listing</h2>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Type</div>
            <div className={styles.cardValue}>{offer.listingType}</div>
            
            <div className={styles.cardLabel}>Title</div>
            <Link 
              href={`/${offer.listingType.toLowerCase() === 'product' ? 'products' : 'requests'}/${offer.listingId}`}
              className={styles.cardLink}
            >
              {offer.listingTitle}
            </Link>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Offer Details</h2>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Offered Item</div>
            <div className={styles.cardValue}>{offer.offeredItem}</div>
            
            {offer.offeredValue && (
              <>
                <div className={styles.cardLabel}>Estimated Value</div>
                <div className={styles.cardValue}>${offer.offeredValue.toFixed(2)}</div>
              </>
            )}
            
            {offer.message && (
              <>
                <div className={styles.cardLabel}>Message</div>
                <div className={styles.cardValue}>{offer.message}</div>
              </>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2>{isMaker ? 'To' : 'From'}</h2>
          <div className={styles.card}>
            {isMaker ? (
              <>
                <div className={styles.cardLabel}>Receiver</div>
                <Link href={getUserProfileUrl(offer.receiver)} className={styles.cardLink}>
                  {offer.receiver.name || 'Unknown'}
                </Link>
                {offer.receiver.location && (
                  <div className={styles.cardMeta}>{offer.receiver.location}</div>
                )}
              </>
            ) : (
              <>
                <div className={styles.cardLabel}>Maker</div>
                <Link href={getUserProfileUrl(offer.maker)} className={styles.cardLink}>
                  {offer.maker.name || 'Unknown'}
                </Link>
                {offer.maker.location && (
                  <div className={styles.cardMeta}>{offer.maker.location}</div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.meta}>
            Created {new Date(offer.createdAt).toLocaleString()}
          </div>
        </div>

        <div className={styles.actions}>
          {canAccept && (
            <button
              className={styles.acceptBtn}
              onClick={() => handleAction('ACCEPTED')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : '✓ Accept Offer'}
            </button>
          )}
          {canCounter && (
            <button
              className={styles.counterBtn}
              onClick={() => setShowCounterModal(true)}
              disabled={actionLoading}
            >
              🔄 Counter Offer
            </button>
          )}
          {canWithdraw && (
            <button
              className={styles.withdrawBtn}
              onClick={() => handleAction('WITHDRAWN')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Withdraw Offer'}
            </button>
          )}
          {canAccept && (
            <button
              className={styles.rejectBtn}
              onClick={() => handleAction('REJECTED')}
              disabled={actionLoading}
            >
              ✗ Reject
            </button>
          )}
          <Link
            href={`/messages?user=${messageUser.id}`}
            className={styles.messageBtn}
          >
            💬 Message
          </Link>
        </div>

        {counterOffers.length > 0 && (
          <div className={styles.section}>
            <h2>Counter Offers</h2>
            <div className={styles.counterChain}>
              {counterOffers.map((co, i) => (
                <div key={co.id} className={styles.counterCard}>
                  <div className={styles.counterHeader}>
                    <span className={styles.counterLabel}>
                      Counter #{i + 1} — {new Date(co.createdAt).toLocaleString()}
                    </span>
                    <span 
                      className={styles.counterStatus}
                      style={{ backgroundColor: STATUS_LABELS[co.status]?.color || '#888' }}
                    >
                      {STATUS_LABELS[co.status]?.label || co.status}
                    </span>
                  </div>
                  <div className={styles.counterFrom}>
                    From: <Link href={getUserProfileUrl(co.maker)} className={styles.cardLink}>
                      {co.maker.name || 'Unknown'}
                    </Link>
                  </div>
                  <div className={styles.counterItem}>
                    <strong>Offering:</strong> {co.offeredItem}
                    {co.offeredValue && <span className={styles.counterValue}> (est. ${co.offeredValue.toFixed(2)})</span>}
                  </div>
                  {co.message && (
                    <div className={styles.counterMessage}>
                      <strong>Message:</strong> {co.message}
                    </div>
                  )}
                  <Link href={`/offers/${co.id}`} className={styles.viewCounterBtn}>
                    View Full Details →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {offer && (
        <CounterOfferModal
          isOpen={showCounterModal}
          onClose={() => setShowCounterModal(false)}
          originalOffer={{
            offeredItem: offer.offeredItem,
            offeredValue: offer.offeredValue,
            message: offer.message,
            makerName: offer.maker.name || 'Unknown'
          }}
          listingTitle={offer.listingTitle}
          listingId={offer.listingId}
          offerId={offer.id}
        />
      )}
    </div>
    </ErrorBoundary>
  )
}
