'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useToast } from '@/context/ToastContext'
import Rating from '@/components/Rating'
import { getUserProfileUrl } from '@/lib/utils'
import { MakeOfferModal } from '@/components/MakeOfferModal'
import { ComingSoonModal } from '@/components/ComingSoonModal'
import Breadcrumbs from '@/components/Breadcrumbs'
import RoleBadge from '@/components/RoleBadge'
import { usdToCrypto } from '@/lib/prices'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  type: string
  category: string | null
  condition: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  isGlobal: boolean
  imageUrl: string | null
  user: {
    id: string
    name: string | null
    email: string
    shopSlug: string | null
    role: string
    userClass: string | null
  }
  createdAt: string
  acceptsRequests: boolean
  acceptsOffers: boolean
  requestPrice: number | null
  sellerPayoutAddress: string | null
  sellerCryptoCurrency: string | null
}

interface Plan {
  id: string
  title: string
  status: string
}

interface Plan {
  id: string
  title: string
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const { addItem } = useCart()
  const { settings } = useSiteSettings()
  const { success, error, warning, info } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [sellerShop, setSellerShop] = useState<{hasShop: boolean, shopSlug?: string, shopName?: string} | null>(null)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'PRODUCT',
    category: '',
    condition: '',
    location: '',
    locationDetails: '',
    isGlobal: false,
    published: true,
    sellerPayoutAddress: '',
    sellerCryptoCurrency: 'ETH'
  })
  const [saving, setSaving] = useState(false)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState('')
  const [addingToPlan, setAddingToPlan] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [requestGoal, setRequestGoal] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [showEscrowModal, setShowEscrowModal] = useState(false)
  const [escrowLoading, setEscrowLoading] = useState(false)
  const [courierServices, setCourierServices] = useState<{id: string, name: string, basePrice: number}[]>([])
  const [selectedCourier, setSelectedCourier] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [showFundingModal, setShowFundingModal] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const [fundingLoading, setFundingLoading] = useState(false)
  const [currentFunding, setCurrentFunding] = useState(0)
  const [copiedPayout, setCopiedPayout] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [showEscrowComingSoon, setShowEscrowComingSoon] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return
    
    fetch(`/api/products/${resolvedParams.id}`)
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({ error: 'Failed to fetch product' })).then(data => {
            throw new Error(data.error || 'Request failed')
          })
        }
        return res.json()
      })
      .then(data => {
        setProduct(data)
        setEditData({
          title: data.title,
          description: data.description || '',
          price: data.price?.toString() || '',
          type: data.type,
          category: data.category || '',
          condition: data.condition || '',
          location: data.location || '',
          locationDetails: data.locationDetails || '',
          isGlobal: data.isGlobal,
          published: data.published,
          sellerPayoutAddress: data.sellerPayoutAddress || '',
          sellerCryptoCurrency: data.sellerCryptoCurrency || 'ETH'
        })
        fetch(`/api/user/shop?userId=${data.user.id}`)
          .then(r => {
            if (!r.ok) throw new Error('Failed to fetch shop')
            return r.json()
          })
          .then(shop => setSellerShop(shop))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [resolvedParams])

  useEffect(() => {
    if (session?.user?.id && product) {
      setIsOwner(session.user.id === product.user.id)
    }
  }, [session, product])

  useEffect(() => {
    if (showPlanModal) {
      fetch('/api/plans')
        .then(res => {
          if (!res.ok) {
            return res.json().catch(() => ({ error: 'Failed to fetch plans' })).then(data => {
              throw new Error(data.error || 'Request failed')
            })
          }
          return res.json()
        })
        .then(data => {
          const userPlans = Array.isArray(data) ? data.filter((p: Plan) => p.status === 'ACTIVE') : []
          setPlans(userPlans)
        })
    }
  }, [showPlanModal])

  const handleMakeRequest = async () => {
    if (!requestTitle.trim() || !product) return
    setRequestLoading(true)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: requestTitle || `Wanted: ${product.title}`,
          description: requestDesc || `Looking for: ${product.title}`,
          productId: product.id,
          goalAmount: requestGoal ? parseFloat(requestGoal) : (product.price || 0),
          isPublic: true
        })
      })

      if (res.ok) {
        success('Request posted! Request is now live for community funding.')
        setShowRequestModal(false)
        setRequestTitle('')
        setRequestDesc('')
        setRequestGoal('')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to post request')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRequestLoading(false)
    }
  }

  const handleAddToPlan = async () => {
    if (!selectedPlan || !product) return
    setAddingToPlan(true)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Request: ${product.title}`,
          description: `Request for product: ${product.title}`,
          planId: selectedPlan,
          productId: product.id
        })
      })

      if (res.ok) {
        success('Added to plan!')
        setShowPlanModal(false)
        setSelectedPlan('')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to add to plan')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingToPlan(false)
    }
  }

  const handleEscrowCheckout = async () => {
    if (!product || !session?.user) {
      info('Please sign in to use escrow checkout')
      return
    }
    setEscrowLoading(true)
    try {
      const selectedService = courierServices.find(c => c.id === selectedCourier)
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: product.user.id,
          amount: product.price,
          productId: product.id,
          description: `Purchase: ${product.title}`,
          courierId: selectedCourier || null,
          courierFee: selectedService?.basePrice || null,
          courierService: selectedService?.name || null,
          deliveryAddress: deliveryAddress || null
        })
      })
      if (res.ok) {
        const data = await res.json()
        success(`Escrow created! Transaction ID: ${data.id}. Please send crypto payment to fund the escrow.`)
        setShowEscrowModal(false)
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create escrow')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEscrowLoading(false)
    }
  }

  const handleFundRequest = async () => {
    if (!product || !session?.user || !fundAmount || parseFloat(fundAmount) <= 0) {
      warning('Please enter a valid amount')
      return
    }
    setFundingLoading(true)
    try {
      const res = await fetch('/api/products/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          amount: parseFloat(fundAmount)
        })
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentFunding(data.currentFunding)
        success('Thank you for your contribution!')
        setShowFundingModal(false)
        setFundAmount('')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to contribute')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFundingLoading(false)
    }
  }

  const openEscrowModal = async () => {
    if (!settings.enableCheckout) {
      setShowEscrowComingSoon(true)
      return
    }
    if (!session?.user) {
      info('Please sign in to use escrow checkout')
      return
    }
    try {
      const res = await fetch('/api/courier')
      if (res.ok) {
        const data = await res.json()
        setCourierServices(data)
      }
    } catch (err) {
      console.error(err)
    }
    setShowEscrowModal(true)
  }

  const handleSave = async () => {
    if (!product) return
    setSaving(true)

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      if (res.ok) {
        const updated = await res.json()
        setProduct(updated)
        setIsEditing(false)
      } else {
        error('Failed to update')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!product || !confirm('Are you sure you want to delete this listing?')) return

    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/products'
      } else {
        error('Failed to delete')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async () => {
    if (!product || !messageContent.trim()) return
    setMessageSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: product.user.id, content: messageContent })
      })
      if (res.ok) {
        success('Message sent!')
        setShowMessageModal(false)
        setMessageContent('')
      } else {
        error('Failed to send message')
      }
    } catch {
      error('Failed to send message')
    } finally {
      setMessageSending(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!product) {
    return <div className={styles.error}>Product not found</div>
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Marketplace', href: '/products' },
        { label: product.title }
      ]} />

      <div className={styles.content}>
        <div className={styles.main}>
          {product.imageUrl && (
            <div className={styles.imageContainer}>
              <img src={product.imageUrl} alt={product.title} className={styles.image} />
            </div>
          )}

          {isEditing ? (
            <div className={styles.editForm}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={e => setEditData({...editData, title: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editData.description}
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  rows={4}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={editData.type}
                    onChange={e => setEditData({...editData, type: e.target.value})}
                  >
                    <option value="PRODUCT">Product</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    value={editData.price}
                    onChange={e => setEditData({...editData, price: e.target.value})}
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={editData.category}
                    onChange={e => setEditData({...editData, category: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={editData.condition}
                    onChange={e => setEditData({...editData, condition: e.target.value})}
                  >
                    <option value="">Select...</option>
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editData.isGlobal}
                    onChange={e => setEditData({...editData, isGlobal: e.target.checked})}
                  />
                  Available Globally
                </label>
              </div>
              {!editData.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={e => setEditData({...editData, location: e.target.value})}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Location Details</label>
                <input
                  type="text"
                  value={editData.locationDetails}
                  onChange={e => setEditData({...editData, locationDetails: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Payout Crypto</label>
                <select
                  value={editData.sellerCryptoCurrency}
                  onChange={e => setEditData({...editData, sellerCryptoCurrency: e.target.value})}
                >
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="USDT">USDT (Tether)</option>
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="XMR">XMR (Monero)</option>
                  <option value="XTM">XTM (Tari)</option>
                  <option value="ARRR">ARRR (Pirate)</option>
                  <option value="DERO">DERO (Dero)</option>
                  <option value="ZANO">ZANO (Zano)</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payout Address</label>
                <input
                  type="text"
                  value={editData.sellerPayoutAddress}
                  onChange={e => setEditData({...editData, sellerPayoutAddress: e.target.value})}
                  placeholder="Your crypto wallet address"
                />
              </div>
              <div className={styles.editActions}>
                <button onClick={() => setIsEditing(false)} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.header}>
                <div>
                  <span className={`badge badge-${product.type.toLowerCase()}`}>
                    {product.type}
                  </span>
                  {product.category && (
                    <span className={styles.category}>{product.category}</span>
                  )}
                </div>
                {isOwner && (
                  <div className={styles.ownerActions}>
                    <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                      Edit
                    </button>
                    <button onClick={handleDelete} className={styles.deleteBtn}>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <h1>{product.title}</h1>
              
              {product.price && (
                <p className={styles.price}>${product.price}</p>
              )}

              {product.description && (
                <div className={styles.description}>
                  <h3>Description</h3>
                  <p>{product.description}</p>
                </div>
              )}

              {product.condition && (
                <div className={styles.details}>
                  <h3>Condition</h3>
                  <p>{product.condition.replace('_', ' ')}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sellerCard}>
            <h3>Seller</h3>
            <Link href={getUserProfileUrl(product.user)} className={styles.sellerName}>
              {product.user.name || 'Unknown'}
            </Link>
            {product.user.role && <RoleBadge role={product.user.role} />}
            {product.user.userClass && (
              <div className={styles.sellerClasses}>
                {product.user.userClass.split(',').map(c => c.trim()).filter(Boolean).map(cls => (
                  <span key={cls} className={styles.classBadge}>{cls}</span>
                ))}
              </div>
            )}
            <Rating userId={product.user.id} productId={product.id} type="SELLER" />
            {sellerShop?.hasShop && sellerShop.shopSlug && (
              <Link href={`/shop/${sellerShop.shopSlug}`} className={styles.shopLink}>
                Visit {sellerShop.shopName || 'Shop'}
              </Link>
            )}
            {session?.user && !isOwner && (
              <button
                className={styles.messageBtn}
                onClick={() => setShowMessageModal(true)}
              >
                ✉️ Message Seller
              </button>
            )}
          </div>

          <div className={styles.locationCard}>
            <h3>Location</h3>
            <p>{product.isGlobal ? '🌍 Available Globally' : `📍 ${product.location}`}</p>
            {product.locationDetails && (
              <p className={styles.locationDetails}>{product.locationDetails}</p>
            )}
          </div>

          {!product.isGlobal && product.latitude && product.longitude && (
            <div className={styles.mapCard}>
              <div className={styles.mapCardHeader}>
                <h3>📍 Product Location</h3>
                <button
                  className={styles.mapToggleBtn}
                  onClick={() => setMapExpanded(!mapExpanded)}
                >
                  {mapExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <div className={`${styles.mapContainer} ${mapExpanded ? styles.mapExpanded : ''}`}>
                <MapContainer center={[product.latitude, product.longitude]} zoom={13} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[product.latitude, product.longitude]}>
                    <Popup>
                      <strong>{product.title}</strong>
                      <br />
                      {product.location}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}

          {!settings.enableCheckout && session?.user && product.sellerPayoutAddress && (
            <div className={styles.payoutCard}>
              <h3>💰 Direct Crypto Payment</h3>
              <p className={styles.payoutCrypto}>Crypto: {product.sellerCryptoCurrency || 'ETH'}</p>
              <div className={styles.payoutAddress}>
                <code>{product.sellerPayoutAddress}</code>
                <button 
                  className={styles.copyPayoutBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(product.sellerPayoutAddress || '')
                    setCopiedPayout(true)
                    setTimeout(() => setCopiedPayout(false), 2000)
                  }}
                >
                  {copiedPayout ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className={styles.payoutHint}>Send {product.sellerCryptoCurrency || 'ETH'} to this address for direct payment</p>
            </div>
          )}

          {product.price && (
            <div className={styles.priceCard}>
              <p className={styles.price}>${product.price}</p>
              <div className={styles.cryptoConversions}>
                <span className={styles.cryptoLabel}>≈ {usdToCrypto(product.price, 'BTC').toFixed(6)} BTC</span>
                <span className={styles.cryptoLabel}>≈ {usdToCrypto(product.price, 'ETH').toFixed(4)} ETH</span>
                <span className={styles.cryptoLabel}>≈ {usdToCrypto(product.price, 'XMR').toFixed(4)} XMR</span>
              </div>
               <button 
                 className={styles.addToCartBtn}
                 onClick={() => setShowCartModal(true)}
               >
                 Add to Cart
               </button>
              {session?.user && !isOwner && (
                <button 
                  className={styles.escrowBtn}
                  onClick={openEscrowModal}
                >
                  🔒 Escrow Checkout
                </button>
              )}
              {session?.user && !isOwner && product.acceptsOffers !== false && (
                <button 
                  className={styles.addToPlanBtn}
                  onClick={() => setShowOfferModal(true)}
                >
                  🤝 Make Offer
                </button>
              )}
              {product.acceptsRequests && (
                <button 
                  className={styles.addToPlanBtn}
                  onClick={() => setShowPlanModal(true)}
                >
                  Add to Plan
                </button>
              )}
            </div>
          )}

          <div className={styles.priceCard}>
            {session?.user && (
              <button 
                className={styles.addToPlanBtn}
                onClick={() => {
                  setRequestTitle(`Wanted: ${product.title}`)
                  setRequestDesc(`Looking for: ${product.title}`)
                  setRequestGoal(product.price?.toString() || '')
                  setShowRequestModal(true)
                }}
              >
                📝 Request Funding
              </button>
            )}
          </div>

          <div className={styles.metaCard}>
            <p>Listed {new Date(product.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add to Plan</h2>
            <p className={styles.planModalDesc}>Select a plan to add this request to:</p>
            {plans.length === 0 ? (
              <p className={styles.noPlans}>No active plans. Create a plan first.</p>
            ) : (
              <div className="form-group">
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  className={styles.planSelect}
                >
                  <option value="">Select a plan...</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => setShowPlanModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary" 
                disabled={!selectedPlan || addingToPlan}
                onClick={handleAddToPlan}
              >
                {addingToPlan ? 'Adding...' : 'Add to Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && product && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💝 Request Community Funding</h2>
            <p className={styles.planModalDesc}>
              Ask the community to help fund this purchase. Share your request to get funded!
            </p>
            <div className="form-group">
              <label htmlFor="request-title">Request Title</label>
              <input
                id="request-title"
                type="text"
                value={requestTitle}
                onChange={e => setRequestTitle(e.target.value)}
                placeholder="What do you need?"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="request-desc">Description</label>
              <textarea
                id="request-desc"
                value={requestDesc}
                onChange={e => setRequestDesc(e.target.value)}
                placeholder="Provide more details about your request..."
                rows={4}
              />
            </div>
            <div className="form-group">
              <label htmlFor="request-goal">Funding Goal ($)</label>
              <input
                id="request-goal"
                type="number"
                value={requestGoal}
                onChange={e => setRequestGoal(e.target.value)}
                placeholder={product.price ? `$${product.price}` : "0"}
                min="1"
                step="0.01"
              />
            </div>
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => setShowRequestModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary" 
                disabled={!requestTitle.trim() || requestLoading}
                onClick={handleMakeRequest}
              >
                {requestLoading ? 'Creating...' : 'Start Funding Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscrowModal && product && (
        <div className="modal-overlay" onClick={() => setShowEscrowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔒 Secure Escrow Checkout</h2>
            <p className={styles.planModalDesc}>
              Your payment will be held securely until you confirm delivery.
              The seller will receive funds only after you approve.
            </p>
            
            <div className={styles.escrowSummary}>
              <div className={styles.escrowRow}>
                <span>Item:</span>
                <strong>{product.title}</strong>
              </div>
              <div className={styles.escrowRow}>
                <span>Price:</span>
                <strong>${product.price}</strong>
              </div>
              <div className={styles.escrowRow}>
                <span>Platform Fee (10%):</span>
                <span>${((product.price || 0) * 0.10).toFixed(2)}</span>
              </div>
              <div className={styles.escrowRow}>
                <span>Seller:</span>
                <span>{product.user.name || 'Unknown'}</span>
              </div>
            </div>

            {courierServices.length > 0 && (
              <div className="form-group">
                <label>Courier Service (Optional)</label>
                <select
                  value={selectedCourier}
                  onChange={e => setSelectedCourier(e.target.value)}
                  className={styles.planSelect}
                >
                  <option value="">No delivery needed</option>
                  {courierServices.map(courier => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name} - ${courier.basePrice}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedCourier && (
              <div className="form-group">
                <label>Delivery Address</label>
                <textarea
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Enter delivery address..."
                  rows={2}
                />
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => setShowEscrowModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary" 
                disabled={escrowLoading}
                onClick={handleEscrowCheckout}
              >
                {escrowLoading ? 'Creating...' : 'Create Escrow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFundingModal && product && (
        <div className="modal-overlay" onClick={() => setShowFundingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💝 Contribute to Request</h2>
            <p className={styles.planModalDesc}>
              Help fund this product request. When the goal is reached, the seller will be notified.
            </p>
            
            <div className={styles.escrowSummary}>
              <div className={styles.escrowRow}>
                <span>Request:</span>
                <strong>{product.title}</strong>
              </div>
              <div className={styles.escrowRow}>
                <span>Goal:</span>
                <strong>${product.requestPrice}</strong>
              </div>
              <div className={styles.escrowRow}>
                <span>Already raised:</span>
                <span>${currentFunding}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Contribution Amount</label>
              <input
                type="number"
                value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                placeholder="Enter amount..."
                min="1"
                step="0.01"
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => setShowFundingModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary" 
                disabled={fundingLoading || !fundAmount || parseFloat(fundAmount) <= 0}
                onClick={handleFundRequest}
              >
                {fundingLoading ? 'Processing...' : 'Contribute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageModal && product && (
        <div className="modal-overlay" onClick={() => { setShowMessageModal(false); setMessageContent('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>✉️ Message to {product.user.name || 'Seller'}</h2>
            <div className="form-group">
              <textarea
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                placeholder={`Ask about ${product.title}...`}
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.95rem', resize: 'vertical' }}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => { setShowMessageModal(false); setMessageContent('') }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!messageContent.trim() || messageSending}
                onClick={handleSendMessage}
              >
                {messageSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {product && (
        <MakeOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          listingId={product.id}
          listingTitle={product.title}
          listingType="PRODUCT"
          listingOwnerName={product.user.name || undefined}
        />
      )}

      <ComingSoonModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        feature="Shopping cart"
      />

      <ComingSoonModal
        isOpen={showEscrowComingSoon}
        onClose={() => setShowEscrowComingSoon(false)}
        feature="Escrow checkout"
      />
    </div>
  )
}
