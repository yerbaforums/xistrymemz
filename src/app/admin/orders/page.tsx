'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/Skeleton'

interface EscrowTransaction {
  id: string
  amount: number
  currency: string
  status: string
  deliveryStatus: string
  description: string | null
  product: { id: string; title: string; imageUrl: string | null } | null
  buyer: { id: string; name: string | null; email: string }
  seller: { id: string; name: string | null; email: string }
  courier: { id: string; name: string | null } | null
  courierFee: number | null
  platformFee: number
  netAmount: number
  deliveryAddress: string | null
  trackingNumber: string | null
  txHash: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<EscrowTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<EscrowTransaction | null>(null)
  const [, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      checkAdminAndFetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter])

  const checkAdminAndFetch = async () => {
    // For now, allow access - in production, check user role
    fetchOrders()
  }

  const fetchOrders = async () => {
    try {
      const url = filter === 'all' ? '/api/escrow' : `/api/escrow?type=${filter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
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
    } catch (error) {
      console.error('Failed to update order:', error)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#6b7280'
      case 'FUNDED': return '#3b82f6'
      case 'RELEASED': return '#10b981'
      case 'DISPUTED': return '#f59e0b'
      case 'REFUNDED': return '#ef4444'
      case 'CANCELLED': return '#9ca3af'
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
    funded: orders.filter(o => o.status === 'FUNDED').length,
    released: orders.filter(o => o.status === 'RELEASED').length,
    disputed: orders.filter(o => o.status === 'DISPUTED').length,
    totalRevenue: orders.filter(o => o.status === 'RELEASED').reduce((sum, o) => sum + o.platformFee, 0)
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🛠️ Admin - Order Management</h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total Orders</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#3b82f6' }}>{stats.pending}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#10b981' }}>{stats.funded}</span>
          <span className={styles.statLabel}>Funded</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#f59e0b' }}>{stats.disputed}</span>
          <span className={styles.statLabel}>Disputed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>${stats.totalRevenue.toFixed(2)}</span>
          <span className={styles.statLabel}>Platform Revenue</span>
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
            className={`${styles.filterBtn} ${filter === 'asBuyer' ? styles.active : ''}`}
            onClick={() => setFilter('asBuyer')}
          >
            Buyers
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'asSeller' ? styles.active : ''}`}
            onClick={() => setFilter('asSeller')}
          >
            Sellers
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
                  <span 
                    className={styles.deliveryBadge}
                    style={{ 
                      color: order.deliveryStatus === 'COMPLETED' ? '#10b981' : 
                             order.deliveryStatus === 'IN_TRANSIT' ? '#3b82f6' : '#6b7280' 
                    }}
                  >
                    {order.deliveryStatus}
                  </span>
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
        <div className={styles.empty}>No orders found</div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Order #{selectedOrder.id.slice(0, 8)}</h2>
            
            <div className={styles.modalSection}>
              <h3>Transaction Details</h3>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span>Amount:</span>
                  <strong>${selectedOrder.amount.toFixed(2)}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Platform Fee:</span>
                  <strong>${selectedOrder.platformFee.toFixed(2)}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Net to Seller:</span>
                  <strong>${selectedOrder.netAmount.toFixed(2)}</strong>
                </div>
                {selectedOrder.courierFee && (
                  <div className={styles.detailItem}>
                    <span>Courier Fee:</span>
                    <strong>${selectedOrder.courierFee.toFixed(2)}</strong>
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
                <label>
                  <input
                    type="radio"
                    name="status"
                    checked={selectedOrder.status === 'PENDING'}
                    onChange={() => updateOrderStatus(selectedOrder.id, '', { status: 'PENDING' })}
                  />
                  Pending
                </label>
                <label>
                  <input
                    type="radio"
                    name="status"
                    checked={selectedOrder.status === 'FUNDED'}
                    onChange={() => updateOrderStatus(selectedOrder.id, '', { status: 'FUNDED' })}
                  />
                  Funded
                </label>
                <label>
                  <input
                    type="radio"
                    name="status"
                    checked={selectedOrder.status === 'RELEASED'}
                    onChange={() => updateOrderStatus(selectedOrder.id, '', { status: 'RELEASED' })}
                  />
                  Released
                </label>
                <label>
                  <input
                    type="radio"
                    name="status"
                    checked={selectedOrder.status === 'REFUNDED'}
                    onChange={() => updateOrderStatus(selectedOrder.id, '', { status: 'REFUNDED' })}
                  />
                  Refunded
                </label>
                <label>
                  <input
                    type="radio"
                    name="status"
                    checked={selectedOrder.status === 'DISPUTED'}
                    onChange={() => updateOrderStatus(selectedOrder.id, '', { status: 'DISPUTED' })}
                  />
                  Disputed
                </label>
              </div>
            </div>

            <div className={styles.modalSection}>
              <h3>Delivery Status</h3>
              <div className={styles.statusGrid}>
                <label>
                  <input
                    type="radio"
                    name="deliveryStatus"
                    checked={selectedOrder.deliveryStatus === 'PENDING'}
                    onChange={() => updateOrderStatus(selectedOrder.id, 'update_delivery', { deliveryStatus: 'PENDING' })}
                  />
                  Pending
                </label>
                <label>
                  <input
                    type="radio"
                    name="deliveryStatus"
                    checked={selectedOrder.deliveryStatus === 'IN_TRANSIT'}
                    onChange={() => updateOrderStatus(selectedOrder.id, 'update_delivery', { deliveryStatus: 'IN_TRANSIT' })}
                  />
                  In Transit
                </label>
                <label>
                  <input
                    type="radio"
                    name="deliveryStatus"
                    checked={selectedOrder.deliveryStatus === 'DELIVERED'}
                    onChange={() => updateOrderStatus(selectedOrder.id, 'update_delivery', { deliveryStatus: 'DELIVERED' })}
                  />
                  Delivered
                </label>
                <label>
                  <input
                    type="radio"
                    name="deliveryStatus"
                    checked={selectedOrder.deliveryStatus === 'COMPLETED'}
                    onChange={() => updateOrderStatus(selectedOrder.id, 'update_delivery', { deliveryStatus: 'COMPLETED' })}
                  />
                  Completed
                </label>
              </div>
            </div>

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
