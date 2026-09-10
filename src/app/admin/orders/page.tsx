'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'

interface Order {
  id: string
  amount: number
  currency: string
  status: string
  courierStatus: string | null
  description: string | null
  product: { id: string; title: string; imageUrl: string | null } | null
  buyer: { id: string; name: string | null; email: string }
  seller: { id: string; name: string | null; email: string }
  courier: { id: string; name: string | null } | null
  courierFee: number | null
  deliveryAddress: string | null
  trackingNumber: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter])

  async function fetchOrders() {
    try {
      const url = filter === 'all' ? '/api/orders?admin=true' : `/api/orders?type=${filter}&admin=true`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setOrders(data?.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (action: string, dataObj?: object) => {
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
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update order')
      }
    } catch (error) {
      console.error('Failed to update order:', error)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#6b7280'
      case 'PAID': return '#3b82f6'
      case 'SHIPPED': return '#f59e0b'
      case 'DELIVERED': return '#10b981'
      case 'CANCELLED': return '#9ca3af'
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

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.id.toLowerCase().includes(query) ||
      order.buyer.name?.toLowerCase().includes(query) ||
      order.buyer.email.toLowerCase().includes(query) ||
      order.seller.name?.toLowerCase().includes(query) ||
      order.seller.email.toLowerCase().includes(query) ||
      order.product?.title.toLowerCase().includes(query)
    )
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    paid: orders.filter(o => o.status === 'PAID').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    totalVolume: orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.amount, 0)
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Orders' }]} />
      <div className={styles.header}>
        <h1>🛠️ Admin - Order Management</h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total Orders</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#3b82f6' }}>{stats.paid}</span>
          <span className={styles.statLabel}>Paid</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#f59e0b' }}>{stats.shipped}</span>
          <span className={styles.statLabel}>Shipped</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#10b981' }}>{stats.delivered}</span>
          <span className={styles.statLabel}>Delivered</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>${stats.totalVolume.toFixed(2)}</span>
          <span className={styles.statLabel}>Sales Volume</span>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'buyer' ? styles.active : ''}`}
            onClick={() => setFilter('buyer')}
          >
            Buyers
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'seller' ? styles.active : ''}`}
            onClick={() => setFilter('seller')}
          >
            Sellers
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'courier' ? styles.active : ''}`}
            onClick={() => setFilter('courier')}
          >
            Couriers
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Delivery</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td className={styles.orderId}>{order.id.slice(0, 8)}</td>
                <td>{order.product?.title || 'N/A'}</td>
                <td>{order.buyer.name || order.buyer.email}</td>
                <td>{order.seller.name || order.seller.email}</td>
                <td>${order.amount.toFixed(2)}</td>
                <td>
                  <span
                    className={styles.statusBadge}
                    style={{ background: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </span>
                </td>
                <td>
                  {order.courierStatus ? (
                    <span
                      className={styles.deliveryBadge}
                      style={{ color: getCourierColor(order.courierStatus) }}
                    >
                      {order.courierStatus}
                    </span>
                  ) : (
                    <span className={styles.deliveryBadge}>—</span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className={styles.editBtn}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <EmptyState icon="📦" title="No orders found" description="Orders will appear here once customers start purchasing." />
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Order #{selectedOrder.id.slice(0, 8)}</h2>

            <div className={styles.modalSection}>
              <h3>Order Details</h3>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span>Amount:</span>
                  <strong>${selectedOrder.amount.toFixed(2)}</strong>
                </div>
                {selectedOrder.courierFee != null && (
                  <div className={styles.detailItem}>
                    <span>Courier Fee:</span>
                    <strong>${selectedOrder.courierFee.toFixed(2)}</strong>
                  </div>
                )}
                {selectedOrder.trackingNumber && (
                  <div className={styles.detailItem}>
                    <span>Tracking:</span>
                    <strong>{selectedOrder.trackingNumber}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalSection}>
              <h3>Parties</h3>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span>Buyer:</span>
                  <span>{selectedOrder.buyer.name || selectedOrder.buyer.email}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>Seller:</span>
                  <span>{selectedOrder.seller.name || selectedOrder.seller.email}</span>
                </div>
                {selectedOrder.courier && (
                  <div className={styles.detailItem}>
                    <span>Courier:</span>
                    <span>{selectedOrder.courier.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalSection}>
              <h3>Status</h3>
              <div className={styles.statusGrid}>
                {['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                  <label key={s}>
                    <input
                      type="radio"
                      name="status"
                      checked={selectedOrder.status === s}
                      onChange={() => updateOrderStatus('admin_set_status', { status: s })}
                      disabled={updating}
                    />
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

            {selectedOrder.courierStatus !== null && selectedOrder.courierStatus !== undefined && (
              <div className={styles.modalSection}>
                <h3>Courier Status</h3>
                <div className={styles.statusGrid}>
                  {['REQUESTED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'DECLINED'].map(s => (
                    <label key={s}>
                      <input
                        type="radio"
                        name="courierStatus"
                        checked={selectedOrder.courierStatus === s}
                        onChange={() => updateOrderStatus('admin_set_courier', { courierStatus: s })}
                        disabled={updating}
                      />
                      {s.charAt(0) + s.slice(1).toLowerCase() + (s === 'IN_TRANSIT' ? ' (shipped)' : '')}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => setSelectedOrder(null)}
              variant="ghost"
              style={{ marginTop: '20px' }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}