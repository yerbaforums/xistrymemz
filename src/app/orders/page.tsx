'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

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
  product: { id: string; title: string; imageUrl: string | null } | null
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

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error } = useToast()
  const [orders, setOrders] = useState<EscrowTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'asBuyer' | 'asSeller' | 'asCourier'>('all')
  const [selectedOrder, setSelectedOrder] = useState<EscrowTransaction | null>(null)
  const [updating, setUpdating] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageTo, setMessageTo] = useState<{id: string, name: string | null} | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchOrders()
    }
  }, [session, filter])

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/escrow?type=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, action: string, data?: object) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/escrow/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })
      if (res.ok) {
        fetchOrders()
        setSelectedOrder(null)
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
          orderId: selectedOrder?.id
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

  const getOrderTotal = (order: EscrowTransaction) => {
    const platformFee = order.amount * (order.feePercent / 100)
    return order.amount + (order.courierFee || 0) + platformFee
  }

  const getUserRole = (order: EscrowTransaction) => {
    if (order.buyer.id === session?.user?.id) return 'Buyer'
    if (order.seller.id === session?.user?.id) return 'Seller'
    return 'Courier'
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading orders...</div></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Orders & Escrow</h1>
        <p className={styles.subtitle}>Track your transactions and deliveries</p>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'asBuyer' ? styles.active : ''}`}
          onClick={() => setFilter('asBuyer')}
        >
          Purchases
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'asSeller' ? styles.active : ''}`}
          onClick={() => setFilter('asSeller')}
        >
          Sales
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'asCourier' ? styles.active : ''}`}
          onClick={() => setFilter('asCourier')}
        >
          Deliveries
        </button>
      </div>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📦</div>
          <h2>No orders yet</h2>
          <p>When you buy or sell items using escrow, they will appear here</p>
          <Link href="/products" className={styles.browseBtn}>Browse Marketplace</Link>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map(order => (
            <div key={order.id} className={styles.orderCard}>
              <Link href={`/orders/${order.id}`} className={styles.orderCardLink}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderId}>
                    <span className={styles.orderIdLabel}>Order #</span>
                    <span className={styles.orderIdValue}>{order.id.slice(0, 10)}</span>
                    <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                  </div>
                  <span 
                    className={styles.statusBadge}
                    style={{ background: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </span>
                </div>

                {order.product && (
                  <div className={styles.orderProduct}>
                    {order.product.imageUrl && (
                      <img src={order.product.imageUrl} alt={order.product.title} />
                    )}
                    <div className={styles.productInfo}>
                      <h3>{order.product.title}</h3>
                      {order.description && <p>{order.description}</p>}
                    </div>
                  </div>
                )}

                <div className={styles.priceBreakdown}>
                  <div className={styles.priceRow}>
                    <span>Item</span>
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span>Fee ({order.feePercent}%)</span>
                    <span>${order.platformFee.toFixed(2)}</span>
                  </div>
                  {order.courierFee && (
                    <div className={styles.priceRow}>
                      <span>Delivery</span>
                      <span>${order.courierFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`${styles.priceRow} ${styles.totalRow}`}>
                    <span>Total</span>
                    <span>${getOrderTotal(order).toFixed(2)}</span>
                  </div>
                </div>

                <div className={styles.orderMeta}>
                  <span className={styles.paymentBadge}>{order.paymentType || 'ESCROW'}</span>
                  <span className={styles.roleBadge}>{getUserRole(order)}</span>
                  {order.cryptoCurrency && (
                    <span className={styles.cryptoBadge}>{order.cryptoCurrency}</span>
                  )}
                </div>

                <div className={styles.statusTimeline}>
                  <div className={`${styles.timelineStep} ${order.status !== 'PENDING' ? styles.completed : ''}`}>
                    <span className={styles.stepDot}>1</span>
                    <span className={styles.stepLabel}>Created</span>
                  </div>
                  <div className={`${styles.timelineStep} ${order.status === 'FUNDED' || order.status === 'RELEASED' || order.status === 'DISPUTED' ? styles.completed : ''}`}>
                    <span className={styles.stepDot}>2</span>
                    <span className={styles.stepLabel}>Funded</span>
                  </div>
                  <div className={`${styles.timelineStep} ${order.deliveryStatus === 'ACCEPTED' || order.deliveryStatus === 'PICKED_UP' || order.deliveryStatus === 'IN_TRANSIT' || order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'COMPLETED' ? styles.completed : ''}`}>
                    <span className={styles.stepDot}>3</span>
                    <span className={styles.stepLabel}>Pickup</span>
                  </div>
                  <div className={`${styles.timelineStep} ${order.deliveryStatus === 'IN_TRANSIT' || order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'COMPLETED' ? styles.completed : ''}`}>
                    <span className={styles.stepDot}>4</span>
                    <span className={styles.stepLabel}>Shipped</span>
                  </div>
                  <div className={`${styles.timelineStep} ${order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'COMPLETED' ? styles.completed : ''}`}>
                    <span className={styles.stepDot}>5</span>
                    <span className={styles.stepLabel}>Delivered</span>
                  </div>
                  <div className={`${styles.timelineStep} ${order.status === 'RELEASED' ? styles.completed : ''}`}>
                    <span className={styles.stepDot}>6</span>
                    <span className={styles.stepLabel}>Complete</span>
                  </div>
                </div>
              </Link>

              <div className={styles.orderActions}>
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className={styles.viewBtn}
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Order #{selectedOrder.id.slice(0, 10)}</h2>
            <p className={styles.modalDate}>Created {formatDate(selectedOrder.createdAt)}</p>
            
            <div className={styles.modalSection}>
              <h3>Price Breakdown</h3>
              <div className={styles.priceTable}>
                <div className={styles.priceRow}>
                  <span>Item Subtotal</span>
                  <span>${selectedOrder.amount.toFixed(2)}</span>
                </div>
                <div className={styles.priceRow}>
                  <span>Platform Fee ({selectedOrder.feePercent}%)</span>
                  <span>${selectedOrder.platformFee.toFixed(2)}</span>
                </div>
                {selectedOrder.courierFee && (
                  <div className={styles.priceRow}>
                    <span>Courier Delivery</span>
                    <span>${selectedOrder.courierFee.toFixed(2)}</span>
                  </div>
                )}
                <div className={`${styles.priceRow} ${styles.totalRow}`}>
                  <span>Total</span>
                  <span>${getOrderTotal(selectedOrder).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={styles.modalSection}>
              <h3>Order Details</h3>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue} style={{ color: getStatusColor(selectedOrder.status) }}>{selectedOrder.status}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Delivery</span>
                  <span className={styles.detailValue} style={{ color: getDeliveryColor(selectedOrder.deliveryStatus) }}>{selectedOrder.deliveryStatus}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Payment Type</span>
                  <span className={styles.detailValue}>{selectedOrder.paymentType || 'ESCROW'}</span>
                </div>
                {selectedOrder.trackingNumber && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tracking</span>
                    <span className={styles.detailValue}>{selectedOrder.trackingNumber}</span>
                  </div>
                )}
                {selectedOrder.expectedDelivery && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Expected Delivery</span>
                    <span className={styles.detailValue}>{formatDate(selectedOrder.expectedDelivery)}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedOrder.cryptoCurrency && (
              <div className={styles.modalSection}>
                <h3>Crypto Payment</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Currency</span>
                    <span className={styles.detailValue}>{selectedOrder.cryptoCurrency}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Amount</span>
                    <span className={styles.detailValue}>{selectedOrder.cryptoAmount?.toFixed(4)} {selectedOrder.cryptoCurrency}</span>
                  </div>
                  {selectedOrder.paymentAddress && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Payment Address</span>
                      <code className={styles.addressCode}>{selectedOrder.paymentAddress}</code>
                    </div>
                  )}
                  {selectedOrder.fundingTxHash && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Funding TX</span>
                      <code className={styles.txHash}>{selectedOrder.fundingTxHash.slice(0, 16)}...</code>
                    </div>
                  )}
                  {selectedOrder.releaseTxHash && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Release TX</span>
                      <code className={styles.txHash}>{selectedOrder.releaseTxHash.slice(0, 16)}...</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.modalSection}>
              <h3>Parties</h3>
              <div className={styles.partiesList}>
                <div className={styles.partyItem}>
                  <span className={styles.partyRole}>Buyer</span>
                  <span className={styles.partyName}>{selectedOrder.buyer.name || 'Unknown'}</span>
                  {selectedOrder.buyer.id !== session?.user?.id && (
                    <button 
                      onClick={() => openMessageModal({ id: selectedOrder.buyer.id, name: selectedOrder.buyer.name })}
                      className={styles.messageBtn}
                    >
                      Message
                    </button>
                  )}
                </div>
                <div className={styles.partyItem}>
                  <span className={styles.partyRole}>Seller</span>
                  <span className={styles.partyName}>{selectedOrder.seller.name || 'Unknown'}</span>
                  {selectedOrder.seller.id !== session?.user?.id && (
                    <button 
                      onClick={() => openMessageModal({ id: selectedOrder.seller.id, name: selectedOrder.seller.name })}
                      className={styles.messageBtn}
                    >
                      Message
                    </button>
                  )}
                </div>
                {selectedOrder.courier && (
                  <div className={styles.partyItem}>
                    <span className={styles.partyRole}>Courier</span>
                    <span className={styles.partyName}>{selectedOrder.courier.name}</span>
                    <button 
                      onClick={() => {
                        const c = selectedOrder.courier
                        c && openMessageModal({ id: c.id, name: c.name })
                      }}
                      className={styles.messageBtn}
                    >
                      Message
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              {selectedOrder.buyer.id === session?.user?.id && (
                <>
                  {selectedOrder.status === 'PENDING' && (
                    <button 
                      className={styles.fundBtn}
                      disabled={updating}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'fund', { txHash: 'manual-' + Date.now() })}
                    >
                      Fund Escrow
                    </button>
                  )}
                  {selectedOrder.status === 'FUNDED' && (
                    <>
                      <button 
                        className={styles.releaseBtn}
                        disabled={updating}
                        onClick={() => updateOrderStatus(selectedOrder.id, 'release')}
                      >
                        Release Payment
                      </button>
                      <button 
                        className={styles.disputeBtn}
                        disabled={updating}
                        onClick={() => updateOrderStatus(selectedOrder.id, 'dispute')}
                      >
                        Open Dispute
                      </button>
                    </>
                  )}
                </>
              )}

              {selectedOrder.seller.id === session?.user?.id && (
                <>
                  {selectedOrder.status === 'FUNDED' && (
                    <button 
                      className={styles.refundBtn}
                      disabled={updating}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'refund')}
                    >
                      Issue Refund
                    </button>
                  )}
                  {selectedOrder.status === 'DISPUTED' && (
                    <button 
                      className={styles.resolveBtn}
                      disabled={updating}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'refund')}
                    >
                      Resolve (Refund)
                    </button>
                  )}
                </>
              )}

              {selectedOrder.courier?.id === session?.user?.id && (
                <>
                  {selectedOrder.deliveryStatus === 'PENDING' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'REFUNDED' && (
                    <>
                      <button 
                        className={styles.acceptBtn}
                        disabled={updating}
                        onClick={() => updateOrderStatus(selectedOrder.id, 'courier_accept')}
                      >
                        Accept Delivery
                      </button>
                      <button 
                        className={styles.declineBtn}
                        disabled={updating}
                        onClick={() => updateOrderStatus(selectedOrder.id, 'courier_decline')}
                      >
                        Decline Delivery
                      </button>
                    </>
                  )}
                  {selectedOrder.deliveryStatus === 'ACCEPTED' && (
                    <button 
                      className={styles.shipBtn}
                      disabled={updating}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'courier_pickup')}
                    >
                      Mark Picked Up
                    </button>
                  )}
                  {selectedOrder.deliveryStatus === 'PICKED_UP' && (
                    <button 
                      className={styles.shipBtn}
                      disabled={updating}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'update_delivery', { deliveryStatus: 'IN_TRANSIT' })}
                    >
                      Mark In Transit
                    </button>
                  )}
                  {selectedOrder.deliveryStatus === 'IN_TRANSIT' && (
                    <button 
                      className={styles.deliverBtn}
                      disabled={updating}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'confirm_delivery')}
                    >
                      Confirm Delivery
                    </button>
                  )}
                </>
              )}
            </div>

            <button 
              onClick={() => setSelectedOrder(null)} 
              className="btn-ghost"
              style={{ marginTop: '16px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Message {messageTo?.name}</h2>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowMessageModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={sendMessage} disabled={sendingMessage || !messageText.trim()} className="btn-primary">
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}