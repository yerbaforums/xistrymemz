'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { calculateDistance, geocodeLocation } from '@/lib/geocoding'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'

import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  L = require('leaflet')
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

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
  user: { name: string | null }
  pinned: boolean
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const { warning, error, success } = useToast()
  const { settings } = useSiteSettings()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [type, setType] = useState('ALL')
  const [category, setCategory] = useState('ALL')
  const [location, setLocation] = useState('ALL')
  const [showGlobal, setShowGlobal] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [radius, setRadius] = useState('25')
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestProduct, setRequestProduct] = useState<Product | null>(null)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [requestGoal, setRequestGoal] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [condition, setCondition] = useState('ALL')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  const mapRef = useRef<L.Map | null>(null)

  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    type: 'PRODUCT',
    category: '',
    condition: '',
    location: '',
    locationDetails: '',
    isGlobal: false,
    imageUrl: '',
    paymentMethods: [] as string[],
    paymentType: 'BOTH',
    sellerPayoutAddress: '',
    sellerCryptoCurrency: 'ETH'
  })
  const [creating, setCreating] = useState(false)
  const { addItem } = useCart()

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
    } catch (err) {
      console.error(err)
      setUserLocation(null)
    } finally {
      setGeocodingLoading(false)
    }
  }, [zipCode])

  useEffect(() => {
    checkAuth()
    fetchProducts()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (!res.ok) throw new Error('Failed to fetch session')
      const session = await res.json()
      setIsLoggedIn(!!session?.user)
    } catch {
      setIsLoggedIn(false)
    }
  }

  const fetchProducts = () => {
    fetch('/api/products')
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({ error: 'Failed to fetch products' })).then(data => {
            throw new Error(data.error || 'Request failed')
          })
        }
        return res.json()
      })
      .then(data => {
        setProducts(data)
        setFilteredProducts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    let result = [...products]

    if (type !== 'ALL') {
      result = result.filter(p => p.type === type)
    }
    if (category !== 'ALL') {
      result = result.filter(p => p.category === category)
    }
    if (location !== 'ALL') {
      result = result.filter(p => p.location === location)
    }
    if (condition !== 'ALL') {
      result = result.filter(p => p.condition === condition)
    }
    if (showGlobal) {
      result = result.filter(p => p.isGlobal)
    }
    
    if (priceMin) {
      const min = parseFloat(priceMin)
      result = result.filter(p => p.price != null && p.price >= min)
    }
    if (priceMax) {
      const max = parseFloat(priceMax)
      result = result.filter(p => p.price != null && p.price <= max)
    }
    
    if (userLocation && radius) {
      const radiusMiles = parseInt(radius)
      result = result.filter(p => {
        if (p.isGlobal) return true
        if (p.latitude == null || p.longitude == null) return false
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lon,
          p.latitude,
          p.longitude
        )
        return distance <= radiusMiles
      })
    }
    
    if (sortBy === 'price-low') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0))
    } else if (sortBy === 'newest') {
      result.reverse()
    }
    
    setFilteredProducts(result)
  }, [type, category, location, condition, products, userLocation, radius, showGlobal, sortBy, priceMin, priceMax])

  const clearFilters = () => {
    setType('ALL')
    setCategory('ALL')
    setLocation('ALL')
    setCondition('ALL')
    setShowGlobal(false)
    setZipCode('')
    setRadius('25')
    setPriceMin('')
    setPriceMax('')
    setUserLocation(null)
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const locations = [...new Set(products.map(p => p.location).filter(Boolean))]
  const conditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']

  const productsWithCoords = filteredProducts.filter(p => p.isGlobal || (p.latitude != null && p.longitude != null))

  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lon]
    }
    if (productsWithCoords.length > 0) {
      if (productsWithCoords.length === 1) {
        return [productsWithCoords[0].latitude!, productsWithCoords[0].longitude!]
      }
      const lats = productsWithCoords.map(p => p.latitude!)
      const lons = productsWithCoords.map(p => p.longitude!)
      return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lons) + Math.max(...lons)) / 2]
    }
    return [39.8283, -98.5795]
  }

  const getMapZoom = (): number => {
    if (userLocation) return 10
    if (productsWithCoords.length === 0) return 4
    if (productsWithCoords.length === 1) return 13
    const lats = productsWithCoords.map(p => p.latitude!)
    const lons = productsWithCoords.map(p => p.longitude!)
    const latDiff = Math.max(...lats) - Math.min(...lats)
    const lonDiff = Math.max(...lons) - Math.min(...lons)
    const maxDiff = Math.max(latDiff, lonDiff)
    if (maxDiff < 0.1) return 13
    if (maxDiff < 0.5) return 11
    if (maxDiff < 1) return 10
    if (maxDiff < 5) return 8
    if (maxDiff < 10) return 6
    return 4
  }

  const center = getMapCenter()
  const zoom = getMapZoom()

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom, { animate: true })
    }
  }, [center, zoom])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      })

      if (res.ok) {
        setShowCreateModal(false)
        setNewProduct({
          title: '',
          description: '',
          price: '',
          type: 'PRODUCT',
          category: '',
          condition: '',
          location: '',
          locationDetails: '',
          isGlobal: false,
          imageUrl: '',
          paymentMethods: [],
          paymentType: 'BOTH',
          sellerPayoutAddress: '',
          sellerCryptoCurrency: 'ETH'
        })
        fetchProducts()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create product')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleMakeRequest = async () => {
    if (!requestTitle.trim() || !requestProduct) return
    setRequestLoading(true)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: requestTitle || `Wanted: ${requestProduct.title}`,
          description: requestDesc || `Looking for: ${requestProduct.title}`,
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
    } catch (err) {
      console.error(err)
    } finally {
      setRequestLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Marketplace</h1>
          <p className={styles.subtitle}>Discover products and services near you</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isLoggedIn && (
            <>
              <Link href="/dashboard/marketplace" className={styles.createBtn}>
                📦 Manage Listings
              </Link>
              <button onClick={() => setShowCreateModal(true)} className={styles.createBtn}>
                + List Item
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </h2>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">All Types</option>
              <option value="PRODUCT">Products</option>
              <option value="SERVICE">Services</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat!}>{cat}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Location</label>
            <select value={location} onChange={e => setLocation(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">All Locations</option>
              <option value="GLOBAL">Global</option>
              {locations.filter(l => l !== 'GLOBAL').map(loc => (
                <option key={loc} value={loc!}>{loc}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">Any Condition</option>
              {conditions.map(cond => (
                <option key={cond} value={cond}>{cond.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Price Range</label>
            <div className={styles.priceRange}>
              <input
                type="number"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="Min"
                className={styles.filterInput}
              />
              <span>-</span>
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="Max"
                className={styles.filterInput}
              />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.globalCheck}>
              <input
                type="checkbox"
                checked={showGlobal}
                onChange={e => setShowGlobal(e.target.checked)}
              />
              Global listings only
            </label>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Distance from ZIP</label>
            <div className={styles.zipFilter}>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                placeholder="Enter ZIP code"
                className={styles.zipInput}
              />
              <div className={styles.zipRow}>
                <select 
                  value={radius} 
                  onChange={e => setRadius(e.target.value)} 
                  className={styles.filterSelect}
                  disabled={!userLocation && !zipCode}
                >
                  <option value="5">5 mi</option>
                  <option value="10">10 mi</option>
                  <option value="25">25 mi</option>
                  <option value="50">50 mi</option>
                  <option value="100">100 mi</option>
                </select>
                <button 
                  onClick={geocodeZipCode} 
                  className={styles.zipBtn}
                  disabled={geocodingLoading || !zipCode.trim()}
                >
                  {geocodingLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>
          </div>

          <button onClick={clearFilters} className={styles.clearBtn}>
            Clear All Filters
          </button>
        </aside>

        <main className={styles.content}>
          <div className={`${styles.mapSection} ${mapExpanded ? styles.mapExpanded : ''}`}>
            <div className={styles.mapControls}>
              <button 
                className={styles.mapToggle}
                onClick={() => setMapExpanded(!mapExpanded)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {mapExpanded ? (
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                  ) : (
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  )}
                </svg>
                {mapExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <MapContainer 
              center={center} 
              zoom={zoom} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {productsWithCoords.map(product => (
                <Marker 
                  key={product.id} 
                  position={product.isGlobal ? [39.8283, -98.5795] : [product.latitude!, product.longitude!]}
                  eventHandlers={{
                    click: () => setSelectedProduct(product),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 180, padding: '4px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{product.title}</strong>
                      <br />
                      {product.price && <span style={{ color: '#00d9ff', fontWeight: 600 }}>${product.price}</span>}
                      <br />
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        {product.locationDetails || product.location || 'Global'}
                      </span>
                      <br />
                      <Link 
                        href={`/products/${product.id}`}
                        style={{ 
                          color: '#00d9ff', 
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                          display: 'inline-block',
                          marginTop: '6px'
                        }}
                      >
                        View Details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'item' : 'items'} found
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className={styles.sortSelect}
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <div className={styles.viewToggle}>
                <button 
                  className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </button>
                <button 
                  className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="4" width="18" height="4" rx="1"/>
                    <rect x="3" y="10" width="18" height="4" rx="1"/>
                    <rect x="3" y="16" width="18" height="4" rx="1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className={viewMode === 'grid' ? styles.gridView : styles.listView}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                  <path d="M8 11h6"/>
                </svg>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search criteria</p>
                <button onClick={clearFilters} className={styles.clearBtn} style={{ marginTop: '16px' }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className={`${styles.productCard} ${selectedProduct?.id === product.id ? styles.selected : ''}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  {product.imageUrl && (
                    <div className={styles.productThumbnail}>
                      <img src={product.imageUrl} alt={product.title} />
                      <div className={styles.productActions}>
                        <button 
                          className={styles.quickActionBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            addItem({ id: product.id, title: product.title, price: product.price || 0, imageUrl: product.imageUrl })
                          }}
                          title="Add to Cart"
                        >
                          🛒
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={styles.productContent}>
                    <div className={styles.productHeader}>
                      {product.pinned && (
                        <span className={styles.pinnedBadge}>📌 Featured</span>
                      )}
                      <span className={`${styles.badge} ${product.type === 'PRODUCT' ? styles.badgeProduct : styles.badgeService}`}>
                        {product.type}
                      </span>
                      {product.condition && (
                        <span className={styles.condition}>{product.condition.replace('_', ' ')}</span>
                      )}
                      {product.category && (
                        <span className={styles.category}>{product.category}</span>
                      )}
                    </div>
                    <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3>{product.title}</h3>
                    </Link>
                    {product.description && <p className={styles.productDesc}>{product.description}</p>}
                    <div className={styles.productMeta}>
                      <span>📍 {product.isGlobal ? 'Global' : product.location || 'Local'}</span>
                      <span>by {product.user.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className={styles.priceRow}>
                    {product.price ? (
                      <p className={styles.price}>${product.price}</p>
                    ) : (
                      <p className={styles.price}>Free</p>
                    )}
                    <div className={styles.actionBtns}>
                      <Link href={`/products/${product.id}`} className={styles.viewBtn}>
                        View
                      </Link>
                      {session?.user && (
                        <button 
                          className={styles.addBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            setRequestTitle(`Wanted: ${product.title}`)
                            setRequestDesc(`Looking for: ${product.title}`)
                            setRequestGoal(product.price?.toString() || '')
                            setRequestProduct(product)
                            setShowRequestModal(true)
                          }}
                        >
                          💝 Fund
                        </button>
                      )}
                      {product.price && (
                        <button 
                          className={styles.addBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            addItem({ id: product.id, title: product.title, price: product.price || 0, imageUrl: product.imageUrl })
                          }}
                        >
                          + Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>List New Item</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newProduct.title}
                  onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                  placeholder="Item title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  placeholder="Description"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={newProduct.type}
                    onChange={e => setNewProduct({...newProduct, type: e.target.value})}
                  >
                    <option value="PRODUCT">Product</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    placeholder="e.g., Electronics, Cleaning"
                  />
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={newProduct.condition}
                    onChange={e => setNewProduct({...newProduct, condition: e.target.value})}
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
                    checked={newProduct.isGlobal}
                    onChange={e => setNewProduct({...newProduct, isGlobal: e.target.checked})}
                  />
                  Available Globally (no location required)
                </label>
              </div>
              {!newProduct.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={newProduct.location}
                    onChange={e => setNewProduct({...newProduct, location: e.target.value})}
                    placeholder="City, State or full address"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Location Details</label>
                <input
                  type="text"
                  value={newProduct.locationDetails}
                  onChange={e => setNewProduct({...newProduct, locationDetails: e.target.value})}
                  placeholder="Additional details (optional)"
                />
              </div>
              <div className="form-group">
                <label>Payment Methods</label>
                <div className={styles.paymentOptions}>
                  {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Crypto', 'Card'].map(method => (
                    <label key={method} className={styles.paymentCheckbox}>
                      <input
                        type="checkbox"
                        checked={newProduct.paymentMethods.includes(method)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewProduct({...newProduct, paymentMethods: [...newProduct.paymentMethods, method]})
                          } else {
                            setNewProduct({...newProduct, paymentMethods: newProduct.paymentMethods.filter(m => m !== method)})
                          }
                        }}
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Payment Type</label>
                <select
                  value={newProduct.paymentType}
                  onChange={e => setNewProduct({...newProduct, paymentType: e.target.value})}
                >
                  <option value="BOTH">Both (Escrow + Direct)</option>
                  <option value="ESCROW">Escrow Only (Protected)</option>
                  <option value="DIRECT">Direct Payment Only</option>
                </select>
                <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  {newProduct.paymentType === 'ESCROW' && `Buyers pay with escrow protection (${settings.platformFeePercent || 10}% fee)`}
                  {newProduct.paymentType === 'DIRECT' && `Buyers pay directly to your wallet (${Math.round((settings.platformFeePercent || 10) / 2)}% fee)`}
                  {newProduct.paymentType === 'BOTH' && 'Buyers can choose their preferred payment method'}
                </small>
              </div>
              {(newProduct.paymentType === 'DIRECT' || newProduct.paymentType === 'BOTH') && (
                <div className="form-group">
                  <label>Payout Settings</label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Set your crypto address for direct payments. Displayed to buyers when checkout is disabled.
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Crypto</label>
                      <select
                        value={newProduct.sellerCryptoCurrency}
                        onChange={e => setNewProduct({...newProduct, sellerCryptoCurrency: e.target.value})}
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
                        value={newProduct.sellerPayoutAddress}
                        onChange={e => setNewProduct({...newProduct, sellerPayoutAddress: e.target.value})}
                        placeholder="Your crypto wallet address"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'List Item'}
                </button>
              </div>
            </form>
          </div>
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
                placeholder={requestProduct.price ? `$${requestProduct.price}` : "0"}
                min="1"
                step="0.01"
              />
            </div>
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => { setShowRequestModal(false); setRequestProduct(null) }}
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
    </div>
  )
}
