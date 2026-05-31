'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../page.module.css'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'

interface EscrowTransaction {
  id: string
  amount: number
  currency: string
  cryptoAmount: number | null
  cryptoCurrency: string | null
  status: string
  paymentType: string
  deliveryStatus: string
  description: string | null
  notes: string | null
  txHash: string | null
  fundingTxHash: string | null
  releaseTxHash: string | null
  paymentAddress: string | null
  platformFee: number
  netAmount: number
  feePercent: number
  product: { id: string; title: string; imageUrl: string | null; description: string | null } | null
  buyer: { id: string; name: string | null; email: string }
  seller: { id: string; name: string | null; email: string }
  courier: { id: string; name: string | null } | null
  courierFee: number | null
  courierService: string | null
  deliveryAddress: string | null
  trackingNumber: string | null
  expectedDelivery: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export default function OrderDetailPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const { success, error } = useToast()
  const [order, setOrder] = useState<EscrowTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageTo, setMessageTo] = useState<{id: string, name: string | null} | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

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
      const res = await fetch(`/api/escrow/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        setNotes(data.notes || '')
      } else {
        router.push('/orders')
      }
    } catch (err) {
      console.error(err)
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (action: string, data?: object) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/escrow/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })
      if (res.ok) {
        fetchOrder()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
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
          recipientId: messageTo.id,
          content: messageText,
          orderId: order?.id
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
    } catch (err) {
      console.error(err)
    } finally {
      setSendingMessage(false)
    }
  }

  const saveNotes = async () => {
    if (!order) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/escrow/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_notes', notes })
      })
      if (res.ok) {
        fetchOrder()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNotes(false)
    }
  }

  const openMessageModal = (to: {id: string, name: string | null}) => {
    setMessageTo(to)
    setShowMessageModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FUNDED': return '#3b82f6'
      case 'RELEASED': return '#10b981'
      case 'DISPUTED': return '#f97316'
      case 'REFUNDED': return '#ef4444'
      case 'CANCELLED': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getDeliveryColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return '#10b981'
      case 'PICKED_UP': return '#8b5cf6'
      case 'IN_TRANSIT': return '#3b82f6'
      case 'DELIVERED': return '#10b981'
      case 'COMPLETED': return '#10b981'
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

  const getOrderTotal = (o: EscrowTransaction) => {
    const platformFee = o.amount * (o.feePercent / 100)
    return o.amount + (o.courierFee || 0) + platformFee
  }

  const getUserRole = (o: EscrowTransaction) => {
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
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/orders" className={styles.backLink}>Back to Orders</Link>
        <h1>Order #{order.id.slice(0, 10)}</h1>
        <p className={styles.subtitle}>Created {formatDate(order.createdAt)}</p>
      </div>

      <div className={styles.orderDetailGrid}>
        <div className={styles.orderMain}>
          <div className={styles.orderHeader}>
            <span className={styles.statusBadge} style={{ background: getStatusColor(order.status) }}>{order.status}</span>
            <span className={styles.paymentBadge}>{order.paymentType || 'ESCROW'}</span>
            <span className={styles.roleBadge}>{getUserRole(order)}</span>
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
            <h2>Price Breakdown</h2>
            <div className={styles.priceTable}>
              <div className={styles.priceRow}>
                <span>Item Subtotal</span>
                <span>${order.amount.toFixed(2)}</span>
              </div>
              <div className={styles.priceRow}>
                <span>Platform Fee ({order.feePercent}%)</span>
                <span>${order.platformFee.toFixed(2)}</span>
              </div>
              {order.courierFee && (
                <div className={styles.priceRow}>
                  <span>Courier Delivery</span>
                  <span>${order.courierFee.toFixed(2)}</span>
                </div>
              )}
              <div className={`${styles.priceRow} ${styles.totalRow}`}>
                <span>Total</span>
                <span>${getOrderTotal(order).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Delivery</h2>
            <div className={styles.deliveryCard}>
              <div className={styles.deliveryStatus}>
                <span className={styles.statusBadge} style={{ background: getDeliveryColor(order.deliveryStatus) }}>
                  {order.deliveryStatus}
                </span>
                {order.expectedDelivery && (
                  <span className={styles.expectedDate}>Expected: {formatDate(order.expectedDelivery)}</span>
                )}
              </div>
              {order.courierService && (
                <p><strong>Service:</strong> {order.courierService}</p>
              )}
              {order.deliveryAddress && (
                <p><strong>Address:</strong> {order.deliveryAddress}</p>
              )}
              {order.trackingNumber && (
                <p><strong>Tracking:</strong> {order.trackingNumber}</p>
              )}
            </div>
          </div>

          {order.cryptoCurrency && (
            <div className={styles.section}>
              <h2>Crypto Payment</h2>
              <div className={styles.cryptoCard}>
                <div className={styles.priceRow}>
                  <span>Currency</span>
                  <span>{order.cryptoCurrency}</span>
                </div>
                <div className={styles.priceRow}>
                  <span>Amount</span>
                  <span>{order.cryptoAmount?.toFixed(4)} {order.cryptoCurrency}</span>
                </div>
                {order.paymentAddress && (
                  <div className={styles.cryptoField}>
                    <span>Payment Address</span>
                    <code className={styles.addressCode}>{order.paymentAddress}</code>
                  </div>
                )}
                {order.fundingTxHash && (
                  <div className={styles.cryptoField}>
                    <span>Funding Transaction</span>
                    <code className={styles.txHash}>{order.fundingTxHash}</code>
                  </div>
                )}
                {order.releaseTxHash && (
                  <div className={styles.cryptoField}>
                    <span>Release Transaction</span>
                    <code className={styles.txHash}>{order.releaseTxHash}</code>
                  </div>
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
                  <span className={styles.partyEmail}>{order.buyer.email}</span>
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
                  <span className={styles.partyEmail}>{order.seller.email}</span>
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
                    <Button className={styles.fundBtn} disabled={updating} onClick={() => updateOrderStatus('fund', { txHash: 'manual-' + Date.now() })}>
                      Fund Escrow
                    </Button>
                  )}
                  {order.status === 'FUNDED' && (
                    <>
                      <Button className={styles.releaseBtn} disabled={updating} onClick={() => updateOrderStatus('release')}>
                        Release Payment
                      </Button>
                      <Button className={styles.disputeBtn} disabled={updating} onClick={() => updateOrderStatus('dispute')}>
                        Open Dispute
                      </Button>
                    </>
                  )}
                </>
              )}

              {order.seller.id === session?.user?.id && (
                <>
                  {order.status === 'FUNDED' && (
                    <Button className={styles.refundBtn} disabled={updating} onClick={() => updateOrderStatus('refund')}>
                      Issue Refund
                    </Button>
                  )}
                  {order.status === 'DISPUTED' && (
                    <Button className={styles.resolveBtn} disabled={updating} onClick={() => updateOrderStatus('refund')}>
                      Resolve (Refund)
                    </Button>
                  )}
                </>
              )}

              {order.courier?.id === session?.user?.id && (
                <>
                  {order.deliveryStatus === 'PENDING' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                    <>
                      <Button className={styles.acceptBtn} disabled={updating} onClick={() => updateOrderStatus('courier_accept')}>
                        Accept Delivery
                      </Button>
                      <Button className={styles.declineBtn} disabled={updating} onClick={() => updateOrderStatus('courier_decline')}>
                        Decline Delivery
                      </Button>
                    </>
                  )}
                  {order.deliveryStatus === 'ACCEPTED' && (
                    <Button className={styles.shipBtn} disabled={updating} onClick={() => updateOrderStatus('courier_pickup')}>
                      Mark Picked Up
                    </Button>
                  )}
                  {order.deliveryStatus === 'PICKED_UP' && (
                    <Button className={styles.shipBtn} disabled={updating} onClick={() => updateOrderStatus('update_delivery', { deliveryStatus: 'IN_TRANSIT' })}>
                      Mark In Transit
                    </Button>
                  )}
                  {order.deliveryStatus === 'IN_TRANSIT' && (
                    <Button className={styles.deliverBtn} disabled={updating} onClick={() => updateOrderStatus('confirm_delivery')}>
                      Confirm Delivery
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {(order.seller.id === session?.user?.id || order.buyer.id === session?.user?.id) && (
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
            <h3>Timeline</h3>
            <div className={styles.timeline}>
              <div className={`${styles.timelineItem} ${order.status !== 'PENDING' ? styles.completed : ''}`}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <span className={styles.timelineTitle}>Order Created</span>
                  <span className={styles.timelineDate}>{formatDateTime(order.createdAt)}</span>
                </div>
              </div>
              {(order.fundingTxHash || order.status === 'FUNDED') && (
                <div className={`${styles.timelineItem} ${styles.completed}`}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Payment Funded</span>
                    <span className={styles.timelineDate}>{formatDateTime(order.updatedAt)}</span>
                  </div>
                </div>
              )}
              {(order.deliveryStatus === 'IN_TRANSIT' || order.deliveryStatus === 'DELIVERED') && (
                <div className={`${styles.timelineItem} ${styles.completed}`}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Order Shipped</span>
                  </div>
                </div>
              )}
              {order.status === 'RELEASED' && (
                <div className={`${styles.timelineItem} ${styles.completed}`}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>Payment Released</span>
                    {order.completedAt && <span className={styles.timelineDate}>{formatDateTime(order.completedAt)}</span>}
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
    </div>
  )
}