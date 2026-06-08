'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import CollaborateButton from '@/components/CollaborateButton'
import PinToBoardButton from '@/components/PinToBoardButton'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useToast } from '@/context/ToastContext'
import Rating from '@/components/Rating'
import { getUserProfileUrl } from '@/lib/utils'
import { MakeOfferModal } from '@/components/MakeOfferModal'
import { ComingSoonModal } from '@/components/ComingSoonModal'
import EntityActions from '@/components/EntityActions'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import ViewCount from '@/components/ViewCount'
import { useRecordView } from '@/hooks/useRecordView'
import Breadcrumbs from '@/components/Breadcrumbs'
import RoleBadge from '@/components/RoleBadge'
import { getCryptoPrices } from '@/lib/prices'
import { CRYPTO_LOGOS } from '@/lib/constants'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import type { DonationAddr } from '@/types/product'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
import TranslateButton from '@/components/TranslateButton'
import Skeleton from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import LinkedItemsSection from '@/components/LinkedItemsSection'

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
  userId: string
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
  acceptsDonations: boolean
  donationAddress: string | null
  donationCurrency: string | null
  sellerPayoutAddress: string | null
  sellerCryptoCurrency: string | null
  rentalDaily: number | null
  rentalWeekly: number | null
  rentalMonthly: number | null
  rentalDeposit: number | null
  rentalMinDays: number
  rentalMaxDays: number | null
  rentalAvailable: boolean
  acceptsAppointments: boolean
  appointmentDuration?: number | null
  appointmentLeadTime?: number | null
  appointmentLocation?: string | null
  appointmentMeetingLink?: string | null
  appointmentFormFields?: { label: string; type: string; required: boolean }[] | null
  hashtags?: { id: string; tag?: string; hashtag?: { id: string; tag: string } }[]
  viewCount?: number
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

const CRYPTO_DISPLAY = [
  { symbol: 'BTC', decimals: 6, fallback: 68500 },
  { symbol: 'ETH', decimals: 4, fallback: 3450 },
  { symbol: 'USDT', decimals: 2, fallback: 1 },
  { symbol: 'USDC', decimals: 2, fallback: 1 },
  { symbol: 'XMR', decimals: 4, fallback: 165 },
  { symbol: 'XTM', decimals: 4, fallback: 0.06 },
  { symbol: 'ARRR', decimals: 4, fallback: 3.50 },
  { symbol: 'DERO', decimals: 4, fallback: 2.00 },
  { symbol: 'ZANO', decimals: 4, fallback: 0.50 },
  { symbol: 'FIRO', decimals: 2, fallback: 1.20 },
]

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
    acceptsOffers: true,
    acceptsRequests: false,
    acceptsDonations: false,
    selectedDonationAddrs: [] as DonationAddr[],
    sellerPayoutAddress: '',
    sellerCryptoCurrency: 'ETH',
    rentalDaily: '',
    rentalWeekly: '',
    rentalMonthly: '',
    rentalDeposit: '',
    rentalMinDays: 1,
    rentalMaxDays: '',
    rentalAvailable: true
  })
  const userDonationAddrs = useDonationAddresses()
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
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showEscrowComingSoon, setShowEscrowComingSoon] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({})
  const [copiedShare, setCopiedShare] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  useEffect(() => {
    getCryptoPrices().then(prices => {
      const map: Record<string, number> = {}
      for (const p of prices) map[p.symbol] = p.price
      setCryptoPrices(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return
    setFetchError(null)
    
    fetch(`/api/products/${resolvedParams.id}`)
      .then(res => {
        if (res.status === 404) {
          throw new Error('not-found')
        }
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
          acceptsOffers: data.acceptsOffers ?? true,
          acceptsRequests: data.acceptsRequests ?? false,
          acceptsDonations: data.acceptsDonations ?? false,
          selectedDonationAddrs: hydrateDonationAddresses(data.donationAddress, data.donationCurrency, data.donationAddresses),
          sellerPayoutAddress: data.sellerPayoutAddress || '',
          sellerCryptoCurrency: data.sellerCryptoCurrency || 'ETH',
          rentalDaily: data.rentalDaily?.toString() || '',
          rentalWeekly: data.rentalWeekly?.toString() || '',
          rentalMonthly: data.rentalMonthly?.toString() || '',
          rentalDeposit: data.rentalDeposit?.toString() || '',
          rentalMinDays: data.rentalMinDays || 1,
          rentalMaxDays: data.rentalMaxDays?.toString() || '',
          rentalAvailable: data.rentalAvailable ?? true
        })
        fetch(`/api/user/shop?userId=${data.user.id}`)
          .then(r => {
            if (!r.ok) throw new Error('Failed to fetch shop')
            return r.json()
          })
          .then(shop => setSellerShop(shop))
        setLoading(false)
        if (data.category) {
          setRelatedLoading(true)
          fetch(`/api/products?category=${encodeURIComponent(data.category)}&limit=5`)
            .then(res => res.json())
            .then(related => {
              const items = Array.isArray(related?.products) 
                ? related.products.filter((p: Product) => p.id !== data.id).slice(0, 4)
                : []
              setRelatedProducts(items)
              setRelatedLoading(false)
            })
            .catch(() => setRelatedLoading(false))
        }
      })
      .catch((err) => {
        if (err.message === 'not-found') {
          setFetchError('Product not found')
        } else {
          setFetchError(err instanceof Error ? err.message : 'Failed to load product')
        }
        setLoading(false)
      })
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

  useRecordView('product', product?.id || '')

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
      const { selectedDonationAddrs, ...rest } = editData
      const legacy = donationAddressesToLegacy(editData.acceptsDonations ? selectedDonationAddrs : [])
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rest,
          ...legacy,
          donationAddresses: editData.acceptsDonations ? serializeDonationAddresses(selectedDonationAddrs) : null,
        })
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
    if (!product) return
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/products'
      } else {
        error('Failed to delete')
      }
    } catch {
      error('Failed to delete')
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
    return <Skeleton width="100%" height="2rem" />
  }

  if (fetchError) {
    return <div className={styles.error}>{fetchError}</div>
  }

  if (!product) {
    return <div className={styles.error}>Product not found</div>
  }

  return (
    <ErrorBoundary>
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
                    <option value="RENTAL">Rental</option>
                  </select>
                </div>
                {editData.type !== 'RENTAL' && (
                  <div className="form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      value={editData.price}
                      onChange={e => setEditData({...editData, price: e.target.value})}
                      step="0.01"
                    />
                  </div>
                )}
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
              {editData.type === 'RENTAL' && (
                <div className={styles.rentalPricing}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Daily Rate ($)</label>
                      <input type="number" value={editData.rentalDaily} onChange={e => setEditData({...editData, rentalDaily: e.target.value})} placeholder="0.00" step="0.01" />
                    </div>
                    <div className="form-group">
                      <label>Weekly Rate ($)</label>
                      <input type="number" value={editData.rentalWeekly} onChange={e => setEditData({...editData, rentalWeekly: e.target.value})} placeholder="0.00" step="0.01" />
                    </div>
                    <div className="form-group">
                      <label>Monthly Rate ($)</label>
                      <input type="number" value={editData.rentalMonthly} onChange={e => setEditData({...editData, rentalMonthly: e.target.value})} placeholder="0.00" step="0.01" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Deposit ($)</label>
                      <input type="number" value={editData.rentalDeposit} onChange={e => setEditData({...editData, rentalDeposit: e.target.value})} placeholder="0.00" step="0.01" />
                    </div>
                    <div className="form-group">
                      <label>Min Days</label>
                      <input type="number" value={editData.rentalMinDays} onChange={e => setEditData({...editData, rentalMinDays: parseInt(e.target.value) || 1})} min="1" />
                    </div>
                    <div className="form-group">
                      <label>Max Days</label>
                      <input type="number" value={editData.rentalMaxDays} onChange={e => setEditData({...editData, rentalMaxDays: e.target.value})} placeholder="Unlimited" min="1" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" checked={editData.rentalAvailable} onChange={e => setEditData({...editData, rentalAvailable: e.target.checked})} />
                      Available for Rent
                    </label>
                  </div>
                </div>
              )}
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
              <details className={styles.listingSettings}>
                <summary className={styles.settingsSummary}>⚙️ Listing Settings</summary>
                <div className={styles.settingsBody}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={editData.acceptsOffers} onChange={e => setEditData({...editData, acceptsOffers: e.target.checked})} />
                    Accept Barter Offers
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={editData.acceptsRequests} onChange={e => setEditData({...editData, acceptsRequests: e.target.checked})} />
                    Allow adding to Plans
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={editData.acceptsDonations} onChange={e => setEditData({...editData, acceptsDonations: e.target.checked})} />
                    Accept Donations
                  </label>
                  {editData.acceptsDonations && (
                    <DonationAddressPicker
                      savedAddresses={userDonationAddrs}
                      selectedAddresses={editData.selectedDonationAddrs}
                      onAddressesChange={(addrs) => setEditData({...editData, selectedDonationAddrs: addrs})}
                    />
                  )}
                </div>
              </details>

              {settings.enableCheckout && (
                <>
                  <div className="form-group">
                    <label>Payout Address</label>
                    {userDonationAddrs.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        No addresses saved.{' '}
                        <a href="/profile/edit" style={{ color: 'var(--accent-primary)' }}>Add one in profile settings</a>
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {userDonationAddrs.map(da => {
                          const selected = editData.sellerPayoutAddress === da.address && editData.sellerCryptoCurrency === da.currency
                          const shortAddr = da.address.length > 12 ? da.address.slice(0, 4) + '...' + da.address.slice(-4) : da.address
                          return (
                            <button
                              key={da.id}
                              type="button"
                              onClick={() => setEditData({...editData, sellerPayoutAddress: da.address, sellerCryptoCurrency: da.currency})}
                              style={{
                                padding: '6px 12px', borderRadius: 20, border: selected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                background: selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: selected ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.8rem',
                              }}
                            >
                              <span style={{ fontWeight: 600, marginRight: 4 }}>{da.currency}</span>
                              {shortAddr}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
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
                    <button onClick={() => setConfirmDelete(true)} className={styles.deleteBtn}>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <h1>{product.title}</h1>
              
              {product.type === 'RENTAL' ? (
                <div className={styles.rentalPricingDisplay}>
                  <p className={styles.price}>
                    {product.rentalDaily ? `$${product.rentalDaily}/day` : 'Contact for pricing'}
                  </p>
                  <div className={styles.rentalRates}>
                    {product.rentalWeekly && <span>${product.rentalWeekly}/week</span>}
                    {product.rentalMonthly && <span>${product.rentalMonthly}/month</span>}
                  </div>
                  {product.rentalDeposit && <p className={styles.rentalDeposit}>Deposit: ${product.rentalDeposit}</p>}
                  <div className={styles.rentalTerms}>
                    <span>Min: {product.rentalMinDays} day{product.rentalMinDays !== 1 ? 's' : ''}</span>
                    {product.rentalMaxDays && <span>Max: {product.rentalMaxDays} days</span>}
                    <span>{product.rentalAvailable ? '✅ Available' : '❌ Unavailable'}</span>
                  </div>
                </div>
              ) : (
                product.price && <p className={styles.price}>${product.price}</p>
              )}

              {product.description && (
                <div className={styles.description}>
                  <h3>Description</h3>
                  <p>{product.description}</p>
                  <TranslateButton text={product.description} />
                </div>
              )}

              {product.condition && (
                <div className={styles.details}>
                  <h3>Condition</h3>
                  <p>{product.condition.replace('_', ' ')}</p>
                </div>
              )}

              {product.hashtags && product.hashtags.length > 0 && (
                <div className={styles.hashtags}>
                  <h3>Tags</h3>
                  <div className={styles.hashtagList}>
                    {product.hashtags.map((h: any) => (
                      <Link key={h.hashtag?.id || h.id} href={`/hashtag/${h.hashtag?.tag || h.tag}`} className={styles.hashtag}>#{h.hashtag?.tag || h.tag}</Link>
                    ))}
                  </div>
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
              <>
                <button
                  className={styles.messageBtn}
                  onClick={() => setShowMessageModal(true)}
                >
                  ✉️ Message Seller
                </button>
                <CollaborateButton entityType="PRODUCT" entityId={product.id} label="🤝 Collaborate" variant="secondary" />
              </>
            )}
            {session?.user && (
              <PinToBoardButton
                entityType="PRODUCT"
                entityId={product.id}
                entityTitle={product.title}
                entityImage={product.imageUrl || undefined}
                entityLatitude={product.latitude || undefined}
                entityLongitude={product.longitude || undefined}
                variant="ghost"
                label="Pin to Board"
              />
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

          {product.price != null && (
            <div className={styles.priceCard}>
              <p className={styles.price}>${product.price}</p>
              <div className={styles.cryptoConversions}>
                {CRYPTO_DISPLAY.map(({ symbol, decimals, fallback }) => (
                  <span key={symbol} className={styles.cryptoLabel}>
                    <img
                      src={`/crypto-logos/${CRYPTO_LOGOS[symbol] || 'ethereum.png'}`}
                      alt={symbol}
                      className={styles.cryptoLogo}
                    />
                    ≈ {(product.price! / (cryptoPrices[symbol] || fallback)).toFixed(decimals)} {symbol}
                  </span>
                ))}
              </div>
               {settings.enableCheckout ? (
                 <>
                   <button 
                     className={styles.addToCartBtn}
                     onClick={() => setShowCartModal(true)}
                     title="Add to cart"
                   >
                     Add to Cart
                   </button>
                   {session?.user && !isOwner && (
                     <button 
                       className={styles.escrowBtn}
                       onClick={openEscrowModal}
                       title="Escrow checkout"
                     >
                       🔒 Escrow Checkout
                     </button>
                   )}
                 </>
               ) : (
                 <button 
                   className={`${styles.addToCartBtn} ${styles.addToCartBtnDisabled}`}
                   disabled
                   title="Checkout is currently disabled"
                 >
                   Add to Cart
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

          {product.acceptsAppointments && (
            <div className={styles.priceCard}>
              <button className={styles.addToPlanBtn} onClick={() => setShowAppointmentModal(true)}>
                📅 Book Appointment
              </button>
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
            <ViewCount count={product.viewCount || 0} size="md" />
          </div>

          <EntityActions
            entityType="PRODUCT"
            entityId={product.id}
            title={product.title}
            authorId={product.user.id}
            image={product.imageUrl}
            variant="bar"
          />
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

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <BookAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        sellerId={product.userId}
        sellerName={product.user?.name}
        productId={product.id}
        productTitle={product.title}
        defaultDuration={product.appointmentDuration}
        defaultLeadTime={product.appointmentLeadTime}
        defaultLocation={product.appointmentLocation}
        defaultMeetingLink={product.appointmentMeetingLink}
        formFields={product.appointmentFormFields as { label: string; type: 'text' | 'textarea'; required: boolean }[] | null}
      />

      <LinkedItemsSection
        entityType="PRODUCT"
        entityId={product?.id || ''}
        currentUserId={session?.user?.id}
      />

      {relatedProducts.length > 0 && (
        <div className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>Related Products</h2>
          <div className={styles.relatedGrid}>
            {relatedProducts.map(rp => (
              <Link key={rp.id} href={`/products/${rp.id}`} className={styles.relatedCard}>
                {rp.imageUrl && (
                  <div className={styles.relatedCardImage}>
                    <img src={rp.imageUrl} alt={rp.title} />
                  </div>
                )}
                <div className={styles.relatedCardBody}>
                  <span className={styles.relatedCardType}>{rp.type}</span>
                  <span className={styles.relatedCardTitle}>{rp.title}</span>
                  {rp.price != null && <span className={styles.relatedCardPrice}>${rp.price}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {relatedLoading && (
        <div className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>Related Products</h2>
          <div className={styles.relatedGrid}>
            {[1,2,3,4].map(i => (
              <div key={i} className={styles.relatedCard}>
                <Skeleton height="140px" borderRadius="8px 8px 0 0" />
                <div className={styles.relatedCardBody}>
                  <Skeleton width="40%" height="0.75rem" />
                  <Skeleton width="80%" height="0.9rem" />
                  <Skeleton width="30%" height="1rem" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  )
}
