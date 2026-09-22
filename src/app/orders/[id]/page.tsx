'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../page.module.css'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import ReviewPrompt from '@/components/ReviewPrompt'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Order {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  notes: string | null
  quantity: number
  customizationAnswers: { label: string; value: string }[] | null
  rentalStart: string | null
  rentalEnd: string | null
  sellerPayoutAddress: string | null
  sellerPayoutCurrency: string | null
  courierStatus: string | null
  courierFee: number | null
  deliveryAddress: string | null
  trackingNumber: string | null
  acceptedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  product: { id: string; title: string; imageUrl: string | null; description: string | null } | null
  buyer: { id: string; name: string | null; email?: string }
  seller: { id: string; name: string | null; email?: string }
  courier: { id: string; name: string | null } | null
  courierService: { id: string; name: string; serviceType: string; availableAreas: string[] } | null
}

export default function OrderDetailPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const { success, error } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageTo, setMessageTo] = useState<{id: string, name: string | null} | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)

  const orderId = params.id as string

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [sessionStatus, router])

  useEffect(() => {
    if (session?.user && orderId) {
      fetchOrder()
    }
  }, [session, orderId])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data.order)
        setNotes(data.order.notes || '')
        setTrackingInput(data.order.trackingNumber || '')
      } else {
        router.push('/orders')
      }
    } catch {
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrder = async (action: string, dataObj?: object) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...dataObj })
      })
      if (res.ok) {
        success('Order updated')
        fetchOrder()
        if (action === 'deliver' && session?.user?.id === order.buyer.id) {
          setShowReviewPrompt(true)
        }
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update order')
      }
    } catch {
    } finally {
      setUpdating(false)
    }
  }

  const saveNotes = async () => {
    if (!order) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_notes', notes })
      })
      if (res.ok) {
        success('Notes saved')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save notes')
      }
    } catch {
    } finally {
      setSavingNotes(false)
    }
  }

  const sendMessage = async () => {
    if (!messageTo || !messageText.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: messageTo.id,
          content: messageText
        })
      })
      if (res.ok) {
        setMessageText('')
        setShowMessageModal(false)
        success('Message sent!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to send message')
      }
    } catch {
    } finally {
      setSendingMessage(false)
    }
  }

  const openMessageModal = (to: {id: string, name: string | null}) => {
    setMessageTo(to)
    setShowMessageModal(true)
  }

  const submitReview = async (rating: number, comment: string) => {
    if (!order) return
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: order.seller.id,
        rating,
        comment,
        type: 'SELLER',
        productId: order.product?.id,
        transactionId: order.id
      })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to submit review')
    }
    success('Review submitted!')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return '#3b82f6'
      case 'SHIPPED': return '#f59e0b'
      case 'DELIVERED': return '#10b981'
      case 'CANCELLED': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getCourierColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return '#f59e0b'
      case 'BOOKED': return '#3b82f6'
      case 'IN_TRANSIT': return '#8b5cf6'
      case 'DELIVERED': return '#10b981'
      case 'DECLINED': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const getUserRole = (o: Order) => {
    if (o.buyer.id === session?.user?.id) return 'Buyer'
    if (o.seller.id === session?.user?.id) return 'Seller'
    return 'Courier'
  }

  if (sessionStatus === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading order...</div></div>
  }

  if (!order) {
    return <div className={styles.container}><div className={styles.loading}>Order not found</div></div>
  }

  return (
    <ErrorBoundary>
      <div className={styles.container}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Orders', href: '/orders' },
        { label: 'Order details' },
      ]} />
      <div className={styles.header}>
        <Link href="/orders" className={styles.backLink}>Back to Orders</Link>
        <h1>Order #{order.id.slice(0, 10)}</h1>
        <p className={styles.subtitle}>Created {formatDate(order.createdAt)}</p>
      </div>

      <div className={styles.orderDetailGrid}>
        <div className={styles.orderMain}>
          <div className={styles.orderHeader}>
            <span className={styles.statusBadge} style={{ background: getStatusColor(order.status) }}>{order.status}</span>
            <span className={styles.roleBadge}>{getUserRole(order)}</span>
            {order.courierStatus && (
              <span className={styles.paymentBadge} style={{ color: getCourierColor(order.courierStatus) }}>📦 {order.courierStatus}</span>
            )}
          </div>

          {order.product && (
            <div className={styles.section}>
              <h2>Item</h2>
              <div className={styles.productCard}>
                {order.product.imageUrl && (
                  <img src={order.product.imageUrl} alt={order.product.title} className={styles.productImage} />
                )}
                <div className={styles.productInfo}>
                  <h3>{order.product.title}</h3>
                  <p>{order.description || order.product.description}</p>
                </div>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2>Amount</h2>
            <div className={styles.priceTable}>
              <div className={styles.priceRow}>
                <span>Order Amount</span>
                <span>${order.amount.toFixed(2)}</span>
              </div>
              {order.quantity > 1 && (
                <div className={styles.priceRow}>
                  <span>Quantity</span>
                  <span>× {order.quantity}</span>
                </div>
              )}
              {order.courierFee != null && (
                <div className={styles.priceRow}>
                  <span>Courier Delivery</span>
                  <span>${order.courierFee.toFixed(2)}</span>
                </div>
              )}
              <div className={`${styles.priceRow} ${styles.totalRow}`}>
                <span>Total</span>
                <span>${(order.amount + (order.courierFee || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {order.customizationAnswers && order.customizationAnswers.length > 0 && (
            <div className={styles.section}>
              <h2>Customization</h2>
              <div className={styles.deliveryCard}>
                {order.customizationAnswers.filter(a => a.value).map(a => (
                  <p key={a.label} style={{ margin: '6px 0' }}>
                    <strong>{a.label}:</strong> {a.value}
                  </p>
                ))}
              </div>
            </div>
          )}

          {order.rentalStart && order.rentalEnd && (
            <div className={styles.section}>
              <h2>📅 Rental Period</h2>
              <div className={styles.deliveryCard}>
                <div className={styles.priceRow}>
                  <span>Start</span>
                  <span>{new Date(order.rentalStart).toLocaleDateString()}</span>
                </div>
                <div className={styles.priceRow}>
                  <span>End</span>
                  <span>{new Date(order.rentalEnd).toLocaleDateString()}</span>
                </div>
                <div className={styles.priceRow}>
                  <span>Duration</span>
                  <span>{Math.round((new Date(order.rentalEnd).getTime() - new Date(order.rentalStart).getTime()) / 86400000)} days</span>
                </div>
              </div>
            </div>
          )}

          {order.buyer.id === session?.user?.id && order.sellerPayoutAddress && (
            <div className={styles.section}>
              <h2>Pay the Seller</h2>
              <div className={styles.deliveryCard}>
                <p>This is a direct sale — the platform never holds funds. Send payment directly to:</p>
                <code className={styles.addressCode}>{order.sellerPayoutAddress}</code>
                {order.sellerPayoutCurrency && (
                  <p><strong>Currency:</strong> {order.sellerPayoutCurrency}</p>
                )}
              </div>
            </div>
          )}

          {order.courierService && (
            <div className={styles.section}>
              <h2>Delivery</h2>
              <div className={styles.deliveryCard}>
                <div className={styles.deliveryStatus}>
                  <span className={styles.statusBadge} style={{ background: getCourierColor(order.courierStatus || '') }}>
                    {order.courierStatus || 'REQUESTED'}
                  </span>
                  {order.completedAt && (
                    <span className={styles.expectedDate}>Completed: {formatDate(order.completedAt)}</span>
                  )}
                </div>
                <p><strong>Service:</strong> {order.courierService.name} ({order.courierService.serviceType})</p>
                {order.deliveryAddress && (
                  <p><strong>Address:</strong> {order.deliveryAddress}</p>
                )}
                {order.trackingNumber && (
                  <p><strong>Tracking:</strong> {order.trackingNumber}</p>
                )}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2>Parties</h2>
            <div className={styles.partiesList}>
              <div className={styles.partyCard}>
                <span className={styles.partyRole}>Buyer</span>
                <div className={styles.partyInfo}>
                  <span className={styles.partyName}>{order.buyer.name || 'Unknown'}</span>
                </div>
                {order.buyer.id !== session?.user?.id && (
                  <Button onClick={() => openMessageModal({ id: order.buyer.id, name: order.buyer.name })} className={styles.messageBtn}>
                    Message Buyer
                  </Button>
                )}
              </div>
              <div className={styles.partyCard}>
                <span className={styles.partyRole}>Seller</span>
                <div className={styles.partyInfo}>
                  <span className={styles.partyName}>{order.seller.name || 'Unknown'}</span>
                </div>
                {order.seller.id !== session?.user?.id && (
                  <Button onClick={() => openMessageModal({ id: order.seller.id, name: order.seller.name })} className={styles.messageBtn}>
                    Message Seller
                  </Button>
                )}
              </div>
              {order.courier && (
                <div className={styles.partyCard}>
                  <span className={styles.partyRole}>Courier</span>
                  <div className={styles.partyInfo}>
                    <span className={styles.partyName}>{order.courier.name}</span>
                  </div>
                  <Button onClick={() => order.courier && openMessageModal({ id: order.courier.id, name: order.courier.name })} className={styles.messageBtn}>
                    Message Courier
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.orderSidebar}>
          <div className={styles.sidebarSection}>
            <h3>Actions</h3>
            <div className={styles.actionButtons}>
              {order.buyer.id === session?.user?.id && (
                <>
                  {order.status === 'PENDING' && (
                    <>
                      {!order.acceptedAt && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Waiting for the seller to accept this order.
                        </p>
                      )}
                      <Button className={styles.fundBtn} disabled={updating} onClick={() => updateOrder('mark_paid')}>
                        Mark as Paid
                      </Button>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        Pay the seller directly, then mark paid. Paste your payment reference in the notes so they can verify.
                      </p>
                    </>
                  )}
                  {order.status === 'SHIPPED' && (
                    <Button className={styles.deliverBtn} disabled={updating} onClick={() => updateOrder('deliver')}>
                      Confirm Receipt
                    </Button>
                  )}
                </>
              )}

              {order.seller.id === session?.user?.id && (
                <>
                  {order.status === 'PENDING' && !order.acceptedAt && (
                    <>
                      <Button className={styles.acceptBtn} disabled={updating} onClick={() => updateOrder('accept_order')}>
                        Accept Order
                      </Button>
                      <Button className={styles.disputeBtn} disabled={updating} onClick={() => updateOrder('decline_order')}>
                        Decline
                      </Button>
                    </>
                  )}
                  {order.status === 'PAID' && (
                    <Button className={styles.shipBtn} disabled={updating} onClick={() => updateOrder('ship')}>
                      Mark Shipped
                    </Button>
                  )}
                </>
              )}

              {(order.buyer.id === session?.user?.id || order.seller.id === session?.user?.id) && (
                (order.status === 'PENDING' || order.status === 'PAID') && (
                  <Button className={styles.disputeBtn} disabled={updating} onClick={() => updateOrder('cancel')}>
                    Cancel Order
                  </Button>
                )
              )}

              {order.courier?.id === session?.user?.id && order.courierStatus && (
                <>
                  {order.courierStatus === 'REQUESTED' && (
                    <Button className={styles.acceptBtn} disabled={updating} onClick={() => updateOrder('courier_accept')}>
                      Accept Delivery
                    </Button>
                  )}
                  {order.courierStatus === 'BOOKED' && (
                    <Button className={styles.shipBtn} disabled={updating} onClick={() => updateOrder('courier_pickup')}>
                      Mark Picked Up
                    </Button>
                  )}
                  {order.courierStatus === 'IN_TRANSIT' && (
                    <Button className={styles.deliverBtn} disabled={updating} onClick={() => updateOrder('courier_delivered')}>
                      Confirm Delivery
                    </Button>
                  )}
                </>
              )}

              {(order.courier?.id === session?.user?.id || order.seller.id === session?.user?.id) && (
                <div className={styles.trackingRow}>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Add tracking number..."
                    className={styles.trackingInput}
                  />
                  <Button className={styles.shipBtn} disabled={updating || !trackingInput.trim()} onClick={() => updateOrder('update_tracking', { trackingNumber: trackingInput.trim() })}>
                    Save Tracking
                  </Button>
                </div>
              )}
            </div>
          </div>

          {(order.seller.id === session?.user?.id || order.buyer.id === session?.user?.id || order.courier?.id === session?.user?.id) && (
            <div className={styles.sidebarSection}>
              <h3>Order Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this order..."
                rows={4}
                className={styles.notesTextarea}
              />
              <Button onClick={saveNotes} disabled={savingNotes} variant="primary" style={{ marginTop: '8px', width: '100%' }}>
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          )}

          <div className={styles.sidebarSection}>
            <h3>Status</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <span className={styles.timelineTitle}>Order Created</span>
                  <span className={styles.timelineDate}>{formatDateTime(order.createdAt)}</span>
                </div>
              </div>
              {order.status !== 'PENDING' && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Paid</span>
                  </div>
                </div>
              )}
              {order.status === 'SHIPPED' || order.status === 'DELIVERED' ? (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Shipped</span>
                  </div>
                </div>
              ) : null}
              {order.status === 'DELIVERED' && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Delivered</span>
                    {order.completedAt && <span className={styles.timelineDate}>{formatDateTime(order.completedAt)}</span>}
                  </div>
                </div>
              )}
              {order.status === 'CANCELLED' && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Cancelled</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Message {messageTo?.name}</h2>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message about this order..."
                rows={4}
              />
            </div>
            <div className={styles.modalActions}>
              <Button onClick={() => setShowMessageModal(false)} variant="ghost">Cancel</Button>
              <Button onClick={sendMessage} disabled={sendingMessage || !messageText.trim()} variant="primary">
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReviewPrompt && order && (
        <ReviewPrompt
          open={showReviewPrompt}
          onClose={() => setShowReviewPrompt(false)}
          targetType="seller"
          targetLabel={order.seller.name || 'this seller'}
          onSubmit={submitReview}
        />
      )}
    </div>
    </ErrorBoundary>
  )
}