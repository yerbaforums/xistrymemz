'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { CartItem } from '@/context/CartContext'
import { getCryptoInfo } from '@/lib/crypto-icons'

interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  type: string
  category: string | null
  imageUrl: string | null
  paymentMethods: string | null
  paymentType: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

const CRYPTO_OPTIONS = [
  getCryptoInfo('XMR')!,
  getCryptoInfo('XTM')!,
  getCryptoInfo('ARRR')!,
  getCryptoInfo('DERO')!,
  getCryptoInfo('ZANO')!,
  getCryptoInfo('USDT')!,
  getCryptoInfo('USDC')!,
  getCryptoInfo('ETH')!,
  getCryptoInfo('BTC')!
].filter(Boolean)

const PAYMENT_FEE = 0.02
const DIRECT_FEE = 0.05
const ESCROW_FEE = 0.10

function CheckoutContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [directProduct, setDirectProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_OPTIONS[0] || CRYPTO_OPTIONS[1])
  const [paymentMethod, setPaymentMethod] = useState<'escrow' | 'direct'>('escrow')
  const [courierOption, setCourierOption] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [courierServices, setCourierServices] = useState<{id: string, name: string, basePrice: number}[]>([])
  const [orderCreated, setOrderCreated] = useState<string | null>(null)
  const [escrowData, setEscrowData] = useState<{ id?: string; paymentAddress?: string; cryptoCurrency?: string } | null>(null)
  const [txHash, setTxHash] = useState('')

  const productId = searchParams.get('product')
  const quantity = parseInt(searchParams.get('qty') || '1')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      loadCart()
      if (productId) {
        loadProduct(productId)
      }
      loadCourierServices()
    }
  }, [session, productId])

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
        if (data.paymentType === 'DIRECT') {
          setPaymentMethod('direct')
        } else if (data.paymentType === 'ESCROW') {
          setPaymentMethod('escrow')
        }
      }
    } catch (error) {
      console.error('Failed to load product:', error)
    }
  }

  const loadCourierServices = async () => {
    try {
      const res = await fetch('/api/courier')
      if (res.ok) {
        const data = await res.json()
        setCourierServices(data)
      }
    } catch (error) {
      console.error('Failed to load courier services:', error)
    }
  }

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

  const getPaymentFee = () => {
    if (paymentMethod === 'direct') {
      return getSubtotal() * DIRECT_FEE
    }
    return getSubtotal() * PAYMENT_FEE
  }

  const getPlatformFee = () => {
    if (paymentMethod === 'direct') {
      return 0
    }
    return getSubtotal() * ESCROW_FEE
  }

  const getTotal = () => getSubtotal() + getCourierFee() + getPaymentFee() + getPlatformFee()

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('cart')
  }

  const handleCheckout = async () => {
    if (!session?.user) return
    setProcessing(true)

    try {
      if (directProduct) {
        const res = await fetch('/api/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellerId: directProduct.user.id,
            amount: getSubtotal(),
            currency: 'USD',
            productId: directProduct.id,
            description: `Purchase: ${directProduct.title}`,
            courierId: courierOption || null,
            courierFee: getCourierFee() || null,
            courierService: courierServices.find(c => c.id === courierOption)?.name || null,
            deliveryAddress: deliveryAddress || null,
            cryptoCurrency: selectedCrypto.id,
            paymentType: paymentMethod.toUpperCase()
          })
        })

        if (res.ok) {
          const data = await res.json()
          setOrderCreated(data.id)
          setEscrowData(data)
          clearCart()
        }
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Checkout failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleFundEscrow = async () => {
    if (!escrowData?.id || !txHash) {
      alert('Please enter your transaction hash')
      return
    }
    
    setProcessing(true)
    try {
      const res = await fetch(`/api/escrow/${escrowData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fund',
          txHash: txHash
        })
      })
      
      if (res.ok) {
        alert('Payment confirmed! Your funds are now held in escrow.')
        setEscrowData(null)
        setTxHash('')
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to confirm payment')
      }
    } catch (error) {
      console.error('Funding failed:', error)
      alert('Failed to submit transaction hash')
    } finally {
      setProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>
  }

  const hasItems = directProduct || cartItems.length > 0

  return (
    <div className={styles.container}>
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
          <h2>Order Created!</h2>
          <p className={styles.orderId}>Order ID: <code>{orderCreated}</code></p>
          
          {escrowData?.paymentAddress && (
            <div className={styles.paymentInstructions}>
              <h3>Send Payment</h3>
              <p className={styles.paymentAddress}>
                <strong>Payment Address:</strong>
                <code>{escrowData.paymentAddress}</code>
              </p>
              <p className={styles.paymentAmount}>
                <strong>Amount:</strong> {getSubtotal()} USD equivalent
              </p>
              
              <div className={styles.txHashInput}>
                <label>Enter your transaction hash after sending:</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste your transaction hash here"
                  className={styles.txInput}
                />
                <button 
                  onClick={handleFundEscrow}
                  disabled={processing || !txHash}
                  className={styles.confirmBtn}
                >
                  {processing ? 'Confirming...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          )}

          <div className={styles.nextSteps}>
            <h3>How It Works:</h3>
            <ol>
              <li>Send your payment to the address above</li>
              <li>Enter your transaction hash to track</li>
              <li>Funds held until delivery confirmed</li>
              <li>Payment released to seller</li>
            </ol>
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
              <div className={styles.summaryLine}>
                <span>Payment Fee ({(paymentMethod === 'direct' ? DIRECT_FEE : PAYMENT_FEE) * 100}%)</span>
                <span>${getPaymentFee().toFixed(2)}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Platform Fee ({(paymentMethod === 'direct' ? 0 : ESCROW_FEE) * 100}%)</span>
                <span>${getPlatformFee().toFixed(2)}</span>
              </div>
              <div className={`${styles.summaryLine} ${styles.total}`}>
                <span>Total</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className={styles.paymentSection}>
            <h2>Payment Method</h2>
            
            <div className={styles.paymentOptions}>
              {(!directProduct || directProduct.paymentType === 'BOTH' || directProduct.paymentType === 'ESCROW') && (
                <button
                  className={`${styles.paymentOption} ${paymentMethod === 'escrow' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('escrow')}
                  disabled={!!directProduct && directProduct.paymentType === 'DIRECT'}
                >
                  <span className={styles.optionIcon}>Escrow</span>
                  <div className={styles.optionInfo}>
                    <strong>Secure Escrow</strong>
                    <small>Crypto held until delivery (10% fee)</small>
                  </div>
                </button>
              )}
              {(!directProduct || directProduct.paymentType === 'BOTH' || directProduct.paymentType === 'DIRECT') && (
                <button
                  className={`${styles.paymentOption} ${paymentMethod === 'direct' ? styles.active : ''}`}
                  onClick={() => setPaymentMethod('direct')}
                  disabled={!!directProduct && directProduct.paymentType === 'ESCROW'}
                >
                  <span className={styles.optionIcon}>Direct</span>
                  <div className={styles.optionInfo}>
                    <strong>Direct Payment</strong>
                    <small>Pay directly (5% fee)</small>
                  </div>
                </button>
              )}
            </div>

            {(paymentMethod === 'escrow' || paymentMethod === 'direct') && (
              <>
                <div className={styles.cryptoSelect}>
                  <h3>Select Cryptocurrency</h3>
                  <div className={styles.cryptoGrid}>
                    {CRYPTO_OPTIONS.map(crypto => (
                      <button
                        key={crypto.id}
                        className={`${styles.cryptoBtn} ${selectedCrypto.id === crypto.id ? styles.selected : ''}`}
                        onClick={() => setSelectedCrypto(crypto)}
                      >
                        <span className={styles.cryptoName}>{crypto.symbol}</span>
                      </button>
                    ))}
                  </div>
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

                {paymentMethod === 'escrow' ? (
                  <div className={styles.escrowInfo}>
                    <h3>How Escrow Works</h3>
                    <ol>
                      <li>Payment held securely in escrow</li>
                      <li>Seller ships your item</li>
                      <li>You confirm delivery</li>
                      <li>Payment released to seller</li>
                    </ol>
                  </div>
                ) : (
                  <div className={styles.escrowInfo}>
                    <h3>How Direct Payment Works</h3>
                    <ol>
                      <li>Payment sent directly to seller</li>
                      <li>Faster: no escrow waiting</li>
                      <li>5% fee (lower than escrow)</li>
                    </ol>
                  </div>
                )}

                <button
                  className={styles.checkoutBtn}
                  onClick={handleCheckout}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : `Pay $${getTotal().toFixed(2)}`}
                </button>
              </>
            )}

            <div className={styles.securityBadges}>
              <span>SSL Secured</span>
              <span>Escrow Protected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}