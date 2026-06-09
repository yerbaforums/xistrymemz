'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { calculateDistance, geocodeLocation } from '@/lib/geocoding'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import { PRODUCT_CONDITIONS, PRODUCT_TYPES } from '@/lib/product-categories'
import type { DonationAddr } from '@/types/product'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import Breadcrumbs from '@/components/Breadcrumbs'
import ProductFilters from '@/components/ProductFilters'
import ProductGrid from '@/components/ProductGrid'
import ProductMapView from '@/components/ProductMapView'
import type { Product } from '@/types/product'
import ImageUploader from '@/components/ImageUploader'
import Skeleton, { SkeletonCard, SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Button from '@/components/ui/Button'

const DEBOUNCE_MS = 300

export default function ProductsPage() {
  const { data: session } = useSession()
  const { warning, error, success } = useToast()
  const { settings } = useSiteSettings()
  const { location: passportLocation } = usePassportLocation()
  const { addItem } = useCart()

  const [tab, setTab] = useState<'browse' | 'mylistings'>('browse')

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [type, setType] = useState('ALL')
  const [category, setCategory] = useState('ALL')
  const [location, setLocation] = useState('ALL')
  const [showGlobal, setShowGlobal] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [radius, setRadius] = useState('25')
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [condition, setCondition] = useState('ALL')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestProduct, setRequestProduct] = useState<Product | null>(null)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [requestGoal, setRequestGoal] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)

  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [myProductsLoading, setMyProductsLoading] = useState(false)
  const [myFilter, setMyFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [showMyForm, setShowMyForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [savingMy, setSavingMy] = useState(false)
  const [myForm, setMyForm] = useState({
    title: '',
    description: '',
    price: '',
    type: 'PRODUCT',
    category: '',
    condition: '',
    location: '',
    isGlobal: false,
    imageUrl: '',
    imageUrls: [] as string[],
    published: true,
    acceptsOffers: true,
    acceptsRequests: false,
    acceptsDonations: false,
    selectedDonationAddrs: [] as DonationAddr[],
    hashtags: '',
  })
  const userDonationAddrs = useDonationAddresses()

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlSynced = useRef(false)

  const fetchMyProducts = useCallback(async () => {
    setMyProductsLoading(true)
    try {
      const res = await fetch('/api/products/user')
      const data = await res.json()
      setMyProducts(data)
    } catch {
      // silently fail
    } finally {
      setMyProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'mylistings' && session?.user && myProducts.length === 0) {
      fetchMyProducts()
    }
  }, [tab, session, myProducts.length, fetchMyProducts])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('type')) setType(params.get('type')!)
    if (params.get('category')) setCategory(params.get('category')!)
    if (params.get('location')) setLocation(params.get('location')!)
    if (params.get('condition')) setCondition(params.get('condition')!)
    if (params.get('sort')) setSortBy(params.get('sort')!)
    if (params.get('q')) setSearchQuery(params.get('q')!)
    if (params.get('view')) {
      const v = params.get('view') as 'grid' | 'list' | 'map'
      if (['grid', 'list', 'map'].includes(v)) setViewMode(v)
    }
    if (params.get('min')) setPriceMin(params.get('min')!)
    if (params.get('max')) setPriceMax(params.get('max')!)
    if (params.get('global') === '1') setShowGlobal(true)
    if (params.get('zip')) setZipCode(params.get('zip')!)
    if (params.get('radius')) setRadius(params.get('radius')!)
    urlSynced.current = true
  }, [])

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (type !== 'ALL') params.set('type', type)
    if (category !== 'ALL') params.set('category', category)
    if (location !== 'ALL') params.set('location', location)
    if (condition !== 'ALL') params.set('condition', condition)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (searchQuery) params.set('q', searchQuery)
    if (viewMode !== 'grid') params.set('view', viewMode)
    if (priceMin) params.set('min', priceMin)
    if (priceMax) params.set('max', priceMax)
    if (showGlobal) params.set('global', '1')
    if (zipCode) params.set('zip', zipCode)
    if (radius !== '25') params.set('radius', radius)
    const qs = params.toString()
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [type, category, location, condition, sortBy, searchQuery, viewMode, priceMin, priceMax, showGlobal, zipCode, radius])

  useEffect(() => {
    if (urlSynced.current) syncUrl()
  }, [syncUrl])

  const debouncedSet = useCallback((setter: (v: string) => void, value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setter(value), DEBOUNCE_MS)
  }, [])

  const geocodeZipCode = useCallback(async () => {
    if (!zipCode.trim()) {
      setUserLocation(null)
      return
    }
    setGeocodingLoading(true)
    try {
      const result = await geocodeLocation(zipCode)
      if (result) {
        setUserLocation({ lat: result.latitude, lon: result.longitude })
      } else {
        warning('Could not find location for that zip code')
        setUserLocation(null)
      }
    } catch {
      setUserLocation(null)
    } finally {
      setGeocodingLoading(false)
    }
  }, [zipCode, warning])

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (passportLocation?.latitude && passportLocation?.longitude && !zipCode) {
      setUserLocation({ lat: passportLocation.latitude, lon: passportLocation.longitude })
      setRadius(String(passportLocation.searchRadius || 25))
    }
  }, [passportLocation, zipCode])

  const fetchProducts = () => {
    fetch('/api/products')
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Request failed') })
        return res.json()
      })
      .then(data => {
        const items = Array.isArray(data) ? data : data?.products || []
        setProducts(items)
        setLoading(false)
      })
      .catch((err) => {
        error(err instanceof Error ? err.message : 'Failed to load marketplace')
        setLoading(false)
      })
  }

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (type !== 'ALL') result = result.filter(p => p.type === type)
    if (category !== 'ALL') result = result.filter(p => p.category === category)
    if (location !== 'ALL') result = result.filter(p => p.location === location)
    if (condition !== 'ALL') result = result.filter(p => p.condition === condition)
    if (showGlobal) result = result.filter(p => p.isGlobal)

    if (priceMin) {
      const min = parseFloat(priceMin)
      if (!isNaN(min)) result = result.filter(p => p.price != null && p.price >= min)
    }
    if (priceMax) {
      const max = parseFloat(priceMax)
      if (!isNaN(max)) result = result.filter(p => p.price != null && p.price <= max)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
    }

    if (userLocation && radius) {
      const radiusMiles = parseInt(radius)
      result = result.filter(p => {
        if (p.isGlobal) return true
        if (p.latitude == null || p.longitude == null) return false
        return calculateDistance(userLocation.lat, userLocation.lon, p.latitude, p.longitude) <= radiusMiles
      })
    }

    if (sortBy === 'price-low') result.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sortBy === 'price-high') result.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sortBy === 'newest') result.reverse()

    return result
  }, [products, type, category, location, condition, showGlobal, priceMin, priceMax, searchQuery, userLocation, radius, sortBy])

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products])
  const locations = useMemo(() => [...new Set(products.map(p => p.location).filter(Boolean))], [products])

  const clearFilters = () => {
    setType('ALL'); setCategory('ALL'); setLocation('ALL'); setCondition('ALL')
    setShowGlobal(false); setZipCode(''); setRadius('25'); setPriceMin(''); setPriceMax('')
    setUserLocation(null); setSearchQuery('')
  }

  const handleMySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingMy(true)
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'
      const method = editProduct ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...myForm,
          hashtags: myForm.hashtags ? myForm.hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
          price: myForm.price ? parseFloat(myForm.price) : null,
          paymentMethods: '',
          paymentType: 'BOTH',
          imageUrl: myForm.imageUrls?.[0] || null,
          ...donationAddressesToLegacy(myForm.acceptsDonations ? myForm.selectedDonationAddrs : []),
          donationAddresses: myForm.acceptsDonations ? serializeDonationAddresses(myForm.selectedDonationAddrs) : null,
        }),
      })
      if (res.ok) {
        success(editProduct ? 'Listing updated!' : 'Listing created!')
        fetchMyProducts()
        setShowMyForm(false)
        setEditProduct(null)
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save')
      }
    } catch {
      error('Failed to save listing')
    } finally {
      setSavingMy(false)
    }
  }

  const startMyEdit = (product: Product) => {
    setEditProduct(product)
    setMyForm({
      title: product.title,
      description: product.description || '',
      price: product.price?.toString() || '',
      type: product.type,
      category: product.category || '',
      condition: product.condition || '',
      location: product.location || '',
      isGlobal: product.isGlobal,
      imageUrl: product.imageUrl || '',
      imageUrls: product.imageUrl ? [product.imageUrl] : [] as string[],
      published: product.published,
      acceptsOffers: product.acceptsOffers ?? true,
      acceptsRequests: product.acceptsRequests ?? false,
      acceptsDonations: product.acceptsDonations ?? false,
      selectedDonationAddrs: hydrateDonationAddresses(product.donationAddress, product.donationCurrency, product.donationAddresses),
      hashtags: product.hashtags?.map(h => h.tag).join(', ') || '',
    })
    setShowMyForm(true)
  }

  const toggleMyPublish = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !product.published }),
      })
      if (res.ok) {
        success(!product.published ? 'Published!' : 'Hidden')
        fetchMyProducts()
      } else {
        error('Failed to update')
      }
    } catch {
      error('Failed to update')
    }
  }

  const deleteMyListing = async (product: Product) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Listing deleted')
        fetchMyProducts()
      } else {
        error('Failed to delete')
      }
    } catch {
      error('Failed to delete')
    }
  }

  const handleFund = (product: Product) => {
    setRequestTitle(`Wanted: ${product.title}`)
    setRequestDesc(`Looking for: ${product.title}`)
    setRequestGoal(product.price?.toString() || '')
    setRequestProduct(product)
    setShowRequestModal(true)
  }

  const handleMakeRequest = async () => {
    if (!requestTitle.trim() || !requestProduct) return
    setRequestLoading(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: requestTitle,
          description: requestDesc,
          productId: requestProduct.id,
          goalAmount: requestGoal ? parseFloat(requestGoal) : (requestProduct.price || 0),
          isPublic: true
        })
      })
      if (res.ok) {
        success('Request posted! Request is now live for community funding.')
        setShowRequestModal(false)
        setRequestProduct(null)
        setRequestTitle('')
        setRequestDesc('')
        setRequestGoal('')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to post request')
      }
    } catch {
      error('Failed to post request')
    } finally {
      setRequestLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Marketplace' }
      ]} />

      <div className={styles.header}>
        <div>
          <h1>Marketplace</h1>
          <p className={styles.subtitle}>Discover products and services near you</p>
        </div>
        <div className={styles.headerActions}>
          {session?.user && (
            <Link href="/products/new" className={styles.createBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              List Item
            </Link>
          )}
        </div>
      </div>

      {session?.user && (
        <div className={styles.tabsBar}>
          <Button
            className={`${styles.tabBtn} ${tab === 'browse' ? styles.tabActive : ''}`}
            onClick={() => setTab('browse')}
          >
            Browse
          </Button>
          <Button
            className={`${styles.tabBtn} ${tab === 'mylistings' ? styles.tabActive : ''}`}
            onClick={() => setTab('mylistings')}
          >
            My Listings {myProducts.length > 0 && <span className={styles.tabCount}>{myProducts.length}</span>}
          </Button>
        </div>
      )}

      {tab === 'browse' && (
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products and services..."
            className={styles.searchInput}
          />
          {searchQuery && (
            <Button className={styles.searchClear} onClick={() => setSearchQuery('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Button>
          )}
        </div>
      )}

      {tab === 'browse' && (
        <div className={styles.mainLayout}>
          <ProductFilters
            type={type} category={category} location={location} condition={condition}
            showGlobal={showGlobal} priceMin={priceMin} priceMax={priceMax}
            zipCode={zipCode} radius={radius} geocodingLoading={geocodingLoading}
            hasPassportLocation={!!(passportLocation?.latitude && passportLocation?.longitude)}
            categories={categories} locations={locations}
            onTypeChange={setType} onCategoryChange={setCategory}
            onLocationChange={setLocation} onConditionChange={setCondition}
            onShowGlobalChange={setShowGlobal}
            onPriceMinChange={v => debouncedSet(setPriceMin, v)}
            onPriceMaxChange={v => debouncedSet(setPriceMax, v)}
            onZipCodeChange={v => debouncedSet(setZipCode, v)}
            onRadiusChange={setRadius} onGeocode={geocodeZipCode}
            onClear={clearFilters}
            onUsePassportLocation={() => {
              if (passportLocation?.latitude && passportLocation?.longitude) {
                setUserLocation({ lat: passportLocation.latitude, lon: passportLocation.longitude })
                setRadius(String(passportLocation.searchRadius || 25))
                setZipCode('')
              }
            }}
          />

          <main className={`${styles.content} page-enter`}>
            <div className={styles.resultsHeader}>
              <span className={styles.resultsCount}>
                <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'item' : 'items'} found
              </span>
              <div className={styles.resultsControls}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <div className={styles.viewToggle}>
                  <Button
                    className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </Button>
                  <Button
                    className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="4" width="18" height="4" rx="1"/>
                      <rect x="3" y="10" width="18" height="4" rx="1"/>
                      <rect x="3" y="16" width="18" height="4" rx="1"/>
                    </svg>
                  </Button>
                  <Button
                    className={`${styles.viewToggleBtn} ${viewMode === 'map' ? styles.active : ''}`}
                    onClick={() => setViewMode('map')}
                    title="Map view"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            {viewMode === 'map' ? (
              <ProductMapView products={filteredProducts} userLocation={userLocation} />
            ) : (
              <ProductGrid
                products={filteredProducts}
                loading={loading}
                viewMode={viewMode}
                page={page}
                pageSize={pageSize}
                onViewModeChange={setViewMode}
                onFund={handleFund}
                onClearFilters={clearFilters}
              />
            )}
          </main>
        </div>
      )}

      {tab === 'mylistings' && session?.user && (
        <div className={styles.myListings}>
          <div className={styles.myListingsHeader}>
            <div className={styles.myListingsFilters}>
              <select value={myFilter} onChange={e => setMyFilter(e.target.value as typeof myFilter)} className={styles.myFilterSelect}>
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <span className={styles.myListingsCount}>
                {myProducts.filter(p => {
                  if (myFilter === 'published' && !p.published) return false
                  if (myFilter === 'draft' && p.published) return false
                  return true
                }).length} listings
              </span>
            </div>
            <Link href="/products/new" className={styles.createBtn} style={{ textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Listing
            </Link>
          </div>

          {showMyForm && (
            <div className={styles.myFormSection}>
              <div className={styles.myFormHeader}>
                <h3>{editProduct ? 'Edit Listing' : 'New Listing'}</h3>
                <Button onClick={() => { setShowMyForm(false); setEditProduct(null) }} className={styles.myFormClose}>✕</Button>
              </div>
              <form onSubmit={handleMySubmit} className={styles.myForm}>
                <div className={styles.myFormRow}>
                  <div className="form-group">
                    <label>Title *</label>
                    <input type="text" value={myForm.title} onChange={e => setMyForm({...myForm, title: e.target.value})} placeholder="Item title" required />
                  </div>
                </div>
                <div className={styles.myFormRow}>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={myForm.description} onChange={e => setMyForm({...myForm, description: e.target.value})} placeholder="Description" rows={3} />
                  </div>
                </div>
                <div className={styles.myFormRow}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Price ($)</label>
                    <input type="number" value={myForm.price} onChange={e => setMyForm({...myForm, price: e.target.value})} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Category</label>
                    <input type="text" value={myForm.category} onChange={e => setMyForm({...myForm, category: e.target.value})} placeholder="e.g. Electronics" />
                  </div>
                </div>
                <div className={styles.myFormRow}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Type</label>
                    <select value={myForm.type} onChange={e => setMyForm({...myForm, type: e.target.value})}>
                      {PRODUCT_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Condition</label>
                    <select value={myForm.condition} onChange={e => setMyForm({...myForm, condition: e.target.value})}>
                      <option value="">Select...</option>
                      {PRODUCT_CONDITIONS.map(c => (
                        <option key={c} value={c}>{c.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
  <div className={styles.myFormRow}>
    <div className="form-group" style={{ flex: 1 }}>
      <label>Image</label>
      <ImageUploader images={myForm.imageUrls || []} onChange={(urls) => setMyForm({...myForm, imageUrls: urls})} maxImages={1} />
    </div>
  </div>
  <div className={styles.myFormRow}>
    <div className="form-group" style={{ flex: 1 }}>
      <label>Hashtags</label>
      <input type="text" value={myForm.hashtags} onChange={e => setMyForm({...myForm, hashtags: e.target.value})} placeholder="e.g. tech, vintage, handmade (comma separated)" />
    </div>
  </div>
  <div className={styles.myFormRow}>
    <div className="form-group" style={{ flex: 1 }}>
      <label>Location</label>
                    <input type="text" value={myForm.location} onChange={e => setMyForm({...myForm, location: e.target.value})} placeholder="City, State" />
                  </div>
                  <div className="form-group" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                    <label className={styles.myCheckLabel}>
                      <input type="checkbox" checked={myForm.isGlobal} onChange={e => setMyForm({...myForm, isGlobal: e.target.checked})} />
                      Global
                    </label>
                  </div>
                </div>
                <div className={styles.myFormRow}>
                  <label className={styles.myCheckLabel}>
                    <input type="checkbox" checked={myForm.published} onChange={e => setMyForm({...myForm, published: e.target.checked})} />
                    Publish now
                  </label>
                </div>
                <details className={styles.listingSettings}>
                  <summary className={styles.settingsSummary}>⚙️ Listing Settings</summary>
                  <div className={styles.settingsBody}>
                    <label className={styles.myCheckLabel}>
                      <input type="checkbox" checked={myForm.acceptsOffers} onChange={e => setMyForm({...myForm, acceptsOffers: e.target.checked})} />
                      Accept Barter Offers
                    </label>
                    <label className={styles.myCheckLabel}>
                      <input type="checkbox" checked={myForm.acceptsRequests} onChange={e => setMyForm({...myForm, acceptsRequests: e.target.checked})} />
                      Allow adding to Plans
                    </label>
                    <label className={styles.myCheckLabel}>
                      <input type="checkbox" checked={myForm.acceptsDonations} onChange={e => setMyForm({...myForm, acceptsDonations: e.target.checked})} />
                      Accept Donations
                    </label>
                    {myForm.acceptsDonations && (
                      <DonationAddressPicker
                        savedAddresses={userDonationAddrs}
                        selectedAddresses={myForm.selectedDonationAddrs}
                        onAddressesChange={(addrs) => setMyForm({...myForm, selectedDonationAddrs: addrs})}
                      />
                    )}
                  </div>
                </details>
                <div className={styles.myFormActions}>
                  <Button type="button" onClick={() => { setShowMyForm(false); setEditProduct(null) }} variant="ghost">Cancel</Button>
                  <Button type="submit" variant="primary" disabled={savingMy}>
                    {savingMy ? 'Saving...' : editProduct ? 'Save Changes' : 'Create Listing'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {myProductsLoading ? (
            <SkeletonList count={3} />
          ) : myProducts.filter(p => {
            if (myFilter === 'published' && !p.published) return false
            if (myFilter === 'draft' && p.published) return false
            return true
          }).length === 0 ? (
            <EmptyState icon="📦" title="No listings yet" description="Create your first listing to get started." />
          ) : (
            <div className={styles.myListingsGrid}>
              {myProducts.filter(p => {
                if (myFilter === 'published' && !p.published) return false
                if (myFilter === 'draft' && p.published) return false
                return true
              }).map(product => (
                <div key={product.id} className={styles.myListingCard}>
                  <div className={styles.myListingImage}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} />
                    ) : (
                      <div className={styles.myListingImagePlaceholder}>📦</div>
                    )}
                  </div>
                  <div className={styles.myListingInfo}>
                    <div className={styles.myListingHeader}>
                      <h4>{product.title}</h4>
                      <span className={`badge ${product.published ? 'badge-published' : 'badge-draft'}`}>
                        {product.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className={styles.myListingMeta}>
                      <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                      {product.category && <span className="badge badge-category">{product.category}</span>}
                      <span>{product.price ? `$${product.price}` : 'Free'}</span>
                    </div>
                  </div>
                  <div className={styles.myListingActions}>
                    <Link href={`/products/${product.id}`} className={styles.myListingActionBtn} title="View">👁️</Link>
                    <Button onClick={() => startMyEdit(product)} className={styles.myListingActionBtn} title="Edit">✏️</Button>
                    <Button onClick={() => toggleMyPublish(product)} className={styles.myListingActionBtn} title={product.published ? 'Hide' : 'Publish'}>{product.published ? '👁️‍🗨️' : '✅'}</Button>
                    <Button onClick={() => deleteMyListing(product)} className={styles.myListingActionBtn} title="Delete">🗑️</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRequestModal && requestProduct && (
        <div className="modal-overlay" onClick={() => { setShowRequestModal(false); setRequestProduct(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💝 Request Community Funding</h2>
            <p className="text-secondary mb-4">
              Ask the community to help fund <strong>{requestProduct.title}</strong>!
            </p>
            <div className="form-group">
              <label htmlFor="request-title">Request Title</label>
              <input id="request-title" type="text" value={requestTitle} onChange={e => setRequestTitle(e.target.value)} placeholder="What do you need?" required />
            </div>
            <div className="form-group">
              <label htmlFor="request-desc">Description</label>
              <textarea id="request-desc" value={requestDesc} onChange={e => setRequestDesc(e.target.value)} placeholder="Provide more details about your request..." rows={4} />
            </div>
            <div className="form-group">
              <label htmlFor="request-goal">Funding Goal ($)</label>
              <input id="request-goal" type="number" value={requestGoal} onChange={e => setRequestGoal(e.target.value)} placeholder={requestProduct.price ? `$${requestProduct.price}` : "0"} min="1" step="0.01" />
            </div>
            <div className={styles.modalActions}>
              <Button type="button" onClick={() => { setShowRequestModal(false); setRequestProduct(null) }} variant="ghost">Cancel</Button>
              <Button type="button" variant="primary" disabled={!requestTitle.trim() || requestLoading} onClick={handleMakeRequest}>
                {requestLoading ? 'Creating...' : 'Start Funding Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
