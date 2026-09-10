'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { CartItem } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'
import Loading from '@/components/Loading'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  imageUrl: string | null
  sellerPayoutAddress: string | null
  sellerCryptoCurrency: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface CreatedOrder {
  id: string
  amount: number
  courierFee: number | null
  sellerName: string | null
  sellerPayoutAddress: string | null
  sellerPayoutCurrency: string | null
}

function CheckoutContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success } = useToast()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [directProduct, setDirectProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [courierOption, setCourierOption] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [courierServices, setCourierServices] = useState<{id: string, name: string, basePrice: number}[]>([])
  const [orderCreated, setOrderCreated] = useState<string | null>(null)
  const [createdOrders, setCreatedOrders] = useState<CreatedOrder[]>([])

  const productId = searchParams.get('product')
  const quantity = parseInt(searchParams.get('qty') || '1')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadCart = () => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      setCartItems(JSON.parse(saved))
    }
    setLoading(false)
  }

  const loadProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDirectProduct(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadCourierServices = async () => {
    try {
      const res = await fetch('/api/courier')
      if (res.ok) {
        const data = await res.json()
        setCourierServices(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadCart()
      if (productId) {
        loadProduct(productId)
      }
      loadCourierServices()
    }
  }, [session, productId])

  const getSubtotal = () => {
    if (directProduct && directProduct.price) {
      return directProduct.price * quantity
    }
    return cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
  }

  const getCourierFee = () => {
    const service = courierServices.find(c => c.id === courierOption)
    return service?.basePrice || 0
  }

  const getTotal = () => getSubtotal() + getCourierFee()

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('cart')
  }

  const createOrder = async (sellerId: string, payload: Record<string, unknown>) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerId,
        amount: payload.amount,
        currency: 'USD',
        productId: payload.productId,
        description: payload.description,
        sellerPayoutAddress: payload.sellerPayoutAddress,
        sellerPayoutCurrency: payload.sellerPayoutCurrency,
        courierServiceId: courierOption || null,
        deliveryAddress: courierOption ? (deliveryAddress || null) : null
      })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create order')
    }

    const data = await res.json()
    const order = data.order
    return {
      id: order.id,
      amount: order.amount,
      courierFee: order.courierFee,
      sellerName: payload.sellerName,
      sellerPayoutAddress: order.sellerPayoutAddress,
      sellerPayoutCurrency: order.sellerPayoutCurrency
    } as CreatedOrder
  }

  const handleCheckout = async () => {
    if (!session?.user) return
    setProcessing(true)

    try {
      const results: CreatedOrder[] = []

      if (directProduct) {
        const created = await createOrder(directProduct.user.id, {
          amount: getSubtotal(),
          productId: directProduct.id,
          description: `Purchase: ${directProduct.title}`,
          sellerPayoutAddress: directProduct.sellerPayoutAddress,
          sellerPayoutCurrency: directProduct.sellerCryptoCurrency,
          sellerName: directProduct.user.name
        })
        results.push(created)
        clearCart()
      } else if (cartItems.length > 0) {
        const sellers = new Map<string, {
          items: CartItem[],
          payoutAddress: string | null,
          payoutCurrency: string | null,
          sellerName: string | null
        }>()

        for (const item of cartItems) {
          const res = await fetch(`/api/products/${item.id}`)
          if (!res.ok) continue
          const product: Product = await res.json()
          const sellerId = product.user.id
          const existing = sellers.get(sellerId) || {
            items: [],
            payoutAddress: product.sellerPayoutAddress,
            payoutCurrency: product.sellerCryptoCurrency,
            sellerName: product.user.name
          }
          existing.items.push({ ...item, price: Number(product.price) || item.price })
          sellers.set(sellerId, existing)
        }

        for (const [sellerId, group] of sellers.entries()) {
          const groupTotal = group.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
          const created = await createOrder(sellerId, {
            amount: groupTotal,
            productId: group.items.length === 1 ? group.items[0].id : undefined,
            description: group.items.length === 1
              ? `Purchase: ${group.items[0].title}`
              : `Purchase: ${group.items.map(i => i.title).join(', ')}`,
            sellerPayoutAddress: group.payoutAddress,
            sellerPayoutCurrency: group.payoutCurrency,
            sellerName: group.sellerName
          })
          results.push(created)
        }
        clearCart()
      }

      if (results.length === 0) {
        throw new Error('No order created')
      }

      setCreatedOrders(results)
      setOrderCreated(results[0].id)
      success('Orders created!')
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  const hasItems = directProduct || cartItems.length > 0

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Checkout' },
      ]} />
      <div className={styles.header}>
        <Link href="/products" className={styles.backLink}>← Back to Marketplace</Link>
        <h1>Checkout</h1>
      </div>

      {!hasItems && !orderCreated ? (
        <div className={styles.emptyCart}>
          <div className={styles.emptyIcon}>Cart</div>
          <h2>Your cart is empty</h2>
          <p>Add some items to get started</p>
          <Link href="/products" className={styles.browseBtn}>Browse Marketplace</Link>
        </div>
      ) : orderCreated ? (
        <div className={styles.orderSuccess}>
          <div className={styles.successIcon}>Success</div>
          <h2>Orders Created!</h2>
          <p className={styles.orderId}>These orders are direct sales — the platform never holds funds.</p>

          <div className={styles.paymentInstructions}>
            <h3>Send Payment to the Sellers</h3>
            {createdOrders.map((order) => (
              <div key={order.id} className={styles.paymentCard}>
                <p className={styles.paymentAddress}>
                  <strong>{order.sellerName || 'Seller'}:</strong> ${order.amount.toFixed(2)}
                  {order.courierFee != null && <span> + ${order.courierFee.toFixed(2)} delivery</span>}
                </p>
                {order.sellerPayoutAddress && (
                  <code>{order.sellerPayoutAddress}</code>
                )}
                {order.sellerPayoutCurrency && (
                  <p className={styles.paymentAmount}>{order.sellerPayoutCurrency}</p>
                )}
              </div>
            ))}
            <p className={styles.paymentAddress}>Then mark each order as paid from your Orders page once you transfer.</p>
          </div>

          <div className={styles.successActions}>
            <Link href="/orders" className={styles.primaryBtn}>View Orders</Link>
            <Link href="/products" className={styles.secondaryBtn}>Continue Shopping</Link>
          </div>
        </div>
      ) : (
        <div className={styles.checkoutGrid}>
          <div className={styles.orderSummary}>
            <h2>Order Summary</h2>

            {directProduct && (
              <div className={styles.orderItem}>
                {directProduct.imageUrl && (
                  <img src={directProduct.imageUrl} alt={directProduct.title} />
                )}
                <div className={styles.itemDetails}>
                  <h4>{directProduct.title}</h4>
                  <p>Sold by {directProduct.user.name || 'Unknown'}</p>
                  <p className={styles.itemPrice}>${directProduct.price} x {quantity}</p>
                  {directProduct.sellerPayoutAddress && (
                    <p className={styles.payoutNote}>Payout: {directProduct.sellerCryptoCurrency || 'USD'} — {directProduct.sellerPayoutAddress}</p>
                  )}
                </div>
              </div>
            )}

            {cartItems.map(item => (
              <div key={item.id} className={styles.orderItem}>
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
                <div className={styles.itemDetails}>
                  <h4>{item.title}</h4>
                  <p className={styles.itemPrice}>${item.price} x {item.quantity || 1}</p>
                </div>
              </div>
            ))}

            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}>
                <span>Subtotal</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Delivery</span>
                <span>${getCourierFee().toFixed(2)}</span>
              </div>
              <div className={`${styles.summaryLine} ${styles.total}`}>
                <span>Total</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className={styles.paymentSection}>
            <h2>Direct Payment</h2>
            <div className={styles.escrowInfo}>
              <h3>How Direct Payment Works</h3>
              <ol>
                <li>You pay the seller directly (no platform holds funds)</li>
                <li>Mark the order as paid once you transfer</li>
                <li>Seller ships the item</li>
                <li>You confirm receipt when it arrives</li>
              </ol>
            </div>

            <div className={styles.deliverySection}>
              <h3>Delivery Options</h3>
              {courierServices.length > 0 ? (
                <div className="form-group">
                  <select
                    value={courierOption}
                    onChange={e => setCourierOption(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">No delivery needed</option>
                    {courierServices.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${service.basePrice}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className={styles.noCourier}>No courier services available</p>
              )}

              {courierOption && (
                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your delivery address..."
                    rows={2}
                    className={styles.textarea}
                  />
                </div>
              )}
            </div>

            <button
              className={styles.checkoutBtn}
              onClick={handleCheckout}
              disabled={processing || (!!courierOption && !deliveryAddress.trim())}
            >
              {processing ? 'Processing...' : `Create Order — $${getTotal().toFixed(2)}`}
            </button>

            <div className={styles.securityBadges}>
              <span>SSL Secured</span>
              <span>Direct Payment</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loading size="medium" />}>
      <CheckoutContent />
    </Suspense>
  )
}