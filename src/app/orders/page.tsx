'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Order {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  notes: string | null
  sellerPayoutAddress: string | null
  sellerPayoutCurrency: string | null
  courierStatus: string | null
  courierFee: number | null
  deliveryAddress: string | null
  trackingNumber: string | null
  completedAt: string | null
  createdAt: string
  product: { id: string; title: string } | null
  buyer: { id: string; name: string | null }
  seller: { id: string; name: string | null }
  courier: { id: string; name: string | null } | null
  courierService: { id: string; name: string; serviceType: string } | null
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller' | 'courier'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
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
      const res = await fetch(`/api/orders?type=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data?.orders || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateOrder = async (action: string, dataObj?: object) => {
    if (!selectedOrder) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...dataObj })
      })
      if (res.ok) {
        success('Order updated')
        fetchOrders()
        setSelectedOrder(null)
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update order')
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

  const getUserRole = (order: Order) => {
    if (order.buyer.id === session?.user?.id) return 'Buyer'
    if (order.seller.id === session?.user?.id) return 'Seller'
    return 'Courier'
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading orders...</div></div>
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Orders' },
      ]} />
      <div className={styles.header}>
        <h1>Orders</h1>
        <p className={styles.subtitle}>Track your direct sales and deliveries</p>
      </div>

      <div className={styles.filters}>
        <Button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders
        </Button>
        <Button
          className={`${styles.filterBtn} ${filter === 'buyer' ? styles.active : ''}`}
          onClick={() => setFilter('buyer')}
        >
          Purchases
        </Button>
        <Button
          className={`${styles.filterBtn} ${filter === 'seller' ? styles.active : ''}`}
          onClick={() => setFilter('seller')}
        >
          Sales
        </Button>
        <Button
          className={`${styles.filterBtn} ${filter === 'courier' ? styles.active : ''}`}
          onClick={() => setFilter('courier')}
        >
          Deliveries
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📦</div>
          <h2>No orders yet</h2>
          <p>When you buy or sell items directly, your orders will appear here</p>
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
                    <div className={styles.productInfo}>
                      <h3>{order.product.title}</h3>
                      {order.description && <p>{order.description}</p>}
                    </div>
                  </div>
                )}

                <div className={styles.priceBreakdown}>
                  <div className={styles.priceRow}>
                    <span>Amount</span>
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                  {order.courierFee != null && (
                    <div className={styles.priceRow}>
                      <span>Delivery ({order.courierService?.name || 'Courier'})</span>
                      <span>${order.courierFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className={styles.orderMeta}>
                  <span className={styles.roleBadge}>{getUserRole(order)}</span>
                  {order.courierStatus && (
                    <span className={styles.paymentBadge} style={{ color: getCourierColor(order.courierStatus) }}>
                      📦 {order.courierStatus}
                    </span>
                  )}
                </div>
              </Link>

              <div className={styles.orderActions}>
                <Button
                  onClick={() => { setSelectedOrder(order); setTrackingInput(order.trackingNumber || '') }}
                  className={styles.viewBtn}
                >
                  Manage
                </Button>
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
              <h3>Order Details</h3>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue} style={{ color: getStatusColor(selectedOrder.status) }}>{selectedOrder.status}</span>
                </div>
                {selectedOrder.description && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Description</span>
                    <span className={styles.detailValue}>{selectedOrder.description}</span>
                  </div>
                )}
                {selectedOrder.deliveryAddress && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Delivery</span>
                    <span className={styles.detailValue}>{selectedOrder.deliveryAddress}</span>
                  </div>
                )}
                {selectedOrder.trackingNumber && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tracking</span>
                    <span className={styles.detailValue}>{selectedOrder.trackingNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedOrder.sellerPayoutAddress && selectedOrder.buyer.id === session?.user?.id && (
              <div className={styles.modalSection}>
                <h3>Pay the Seller Directly</h3>
                <p className={styles.payoutHint}>This is a direct sale — the platform never holds funds. Send payment to:</p>
                <code className={styles.addressCode}>{selectedOrder.sellerPayoutAddress}</code>
                {selectedOrder.sellerPayoutCurrency && (
                  <p className={styles.payoutHint}>{selectedOrder.sellerPayoutCurrency}</p>
                )}
              </div>
            )}

            {selectedOrder.courierService && (
              <div className={styles.modalSection}>
                <h3>Courier</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Service</span>
                    <span className={styles.detailValue}>{selectedOrder.courierService.name} ({selectedOrder.courierService.serviceType})</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Status</span>
                    <span className={styles.detailValue} style={{ color: getCourierColor(selectedOrder.courierStatus || '') }}>{selectedOrder.courierStatus || '—'}</span>
                  </div>
                  {selectedOrder.courierFee != null && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Delivery Fee</span>
                      <span className={styles.detailValue}>${selectedOrder.courierFee.toFixed(2)}</span>
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
                    <Button onClick={() => openMessageModal({ id: selectedOrder.buyer.id, name: selectedOrder.buyer.name })} className={styles.messageBtn}>Message</Button>
                  )}
                </div>
                <div className={styles.partyItem}>
                  <span className={styles.partyRole}>Seller</span>
                  <span className={styles.partyName}>{selectedOrder.seller.name || 'Unknown'}</span>
                  {selectedOrder.seller.id !== session?.user?.id && (
                    <Button onClick={() => openMessageModal({ id: selectedOrder.seller.id, name: selectedOrder.seller.name })} className={styles.messageBtn}>Message</Button>
                  )}
                </div>
                {selectedOrder.courier && (
                  <div className={styles.partyItem}>
                    <span className={styles.partyRole}>Courier</span>
                    <span className={styles.partyName}>{selectedOrder.courier.name}</span>
                    <Button
                      onClick={() => {
                        const c = selectedOrder.courier
                        c && openMessageModal({ id: c.id, name: c.name })
                      }}
                      className={styles.messageBtn}
                    >
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalSection}>
              <h3>Status</h3>
              <p className={styles.payoutHint}>Paid → Shipped → Delivered. You coordinate payment and delivery directly with the other party.</p>
            </div>

            <div className={styles.modalActions}>
              {selectedOrder.buyer.id === session?.user?.id && (
                <>
                  {selectedOrder.status === 'PENDING' && (
                    <Button className={styles.fundBtn} disabled={updating} onClick={() => updateOrder('mark_paid')}>Mark as Paid</Button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <Button className={styles.deliverBtn} disabled={updating} onClick={() => updateOrder('deliver')}>Confirm Receipt</Button>
                  )}
                </>
              )}

              {selectedOrder.seller.id === session?.user?.id && (
                <>
                  {selectedOrder.status === 'PAID' && (
                    <Button className={styles.shipBtn} disabled={updating} onClick={() => updateOrder('ship')}>Mark Shipped</Button>
                  )}
                </>
              )}

              {(selectedOrder.buyer.id === session?.user?.id || selectedOrder.seller.id === session?.user?.id) && (
                (selectedOrder.status === 'PENDING' || selectedOrder.status === 'PAID') && (
                  <Button className={styles.cancelBtn} disabled={updating} onClick={() => updateOrder('cancel')}>Cancel Order</Button>
                )
              )}

              {selectedOrder.courier?.id === session?.user?.id && selectedOrder.courierStatus && (
                <>
                  {selectedOrder.courierStatus === 'REQUESTED' && (
                    <Button className={styles.acceptBtn} disabled={updating} onClick={() => updateOrder('courier_accept')}>Accept Delivery</Button>
                  )}
                  {selectedOrder.courierStatus === 'BOOKED' && (
                    <Button className={styles.shipBtn} disabled={updating} onClick={() => updateOrder('courier_pickup')}>Mark Picked Up</Button>
                  )}
                  {selectedOrder.courierStatus === 'IN_TRANSIT' && (
                    <Button className={styles.deliverBtn} disabled={updating} onClick={() => updateOrder('courier_delivered')}>Confirm Delivery</Button>
                  )}
                </>
              )}

              {(selectedOrder.courier?.id === session?.user?.id || selectedOrder.seller.id === session?.user?.id) && (
                <div className={styles.trackingRow}>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Add tracking number..."
                    className={styles.trackingInput}
                  />
                  <Button className={styles.shipBtn} disabled={updating || !trackingInput.trim()} onClick={() => updateOrder('update_tracking', { trackingNumber: trackingInput.trim() })}>Save Tracking</Button>
                </div>
              )}
            </div>

            <Button
              onClick={() => setSelectedOrder(null)}
              variant="ghost"
              style={{ marginTop: '16px' }}
            >
              Close
            </Button>
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