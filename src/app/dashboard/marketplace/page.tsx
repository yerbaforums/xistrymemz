'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'
import styles from './marketplace.module.css'

interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  type: string
  category: string | null
  condition: string | null
  location: string | null
  isGlobal: boolean
  imageUrl: string | null
  published: boolean
  paymentMethods: string | null
  paymentType: string
  acceptsRequests: boolean
  acceptsOffers: boolean
  createdAt: string
}

interface ShopSettings {
  shopName: string | null
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string | null
  email: string | null
  name: string | null
}

function MarketplaceContent() {
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  const editId = searchParams.get('edit')
  const isNew = searchParams.get('new') === 'true'
  
  const [products, setProducts] = useState<Product[]>([])
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'PRODUCT' | 'SERVICE'>('all')
  const [search, setSearch] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showShopModal, setShowShopModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    type: 'PRODUCT',
    category: '',
    condition: '',
    location: '',
    isGlobal: false,
    imageUrl: '',
    paymentMethods: [] as string[],
    paymentType: 'BOTH',
    acceptsRequests: false,
    acceptsOffers: true,
    published: true
  })

  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopAbout: '',
    shopImage: '',
    shopSlug: '',
    email: '',
    name: ''
  })

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (isNew) {
      setShowProductForm(true)
      resetProductForm()
    }
  }, [isNew])

  useEffect(() => {
    if (editId && products.length > 0) {
      const product = products.find(p => p.id === editId)
      if (product) {
        setEditingProduct(product)
        setProductForm({
          title: product.title,
          description: product.description || '',
          price: product.price?.toString() || '',
          type: product.type,
          category: product.category || '',
          condition: product.condition || '',
          location: product.location || '',
          isGlobal: product.isGlobal,
          imageUrl: product.imageUrl || '',
          paymentMethods: product.paymentMethods?.split(',').filter(Boolean) || [],
          paymentType: product.paymentType || 'BOTH',
          acceptsRequests: product.acceptsRequests,
          acceptsOffers: product.acceptsOffers,
          published: product.published
        })
        setShowProductForm(true)
      }
    }
  }, [editId, products])

  const fetchAll = async () => {
    try {
      const [shopRes, productsRes] = await Promise.all([
        fetch('/api/shop'),
        fetch('/api/products/user')
      ])
      const shopData = await shopRes.json()
      const productsData = await productsRes.json()
      setShopSettings(shopData)
      setShopForm({
        shopName: shopData.shopName || '',
        shopAbout: shopData.shopAbout || '',
        shopImage: shopData.shopImage || '',
        shopSlug: shopData.shopSlug || '',
        email: shopData.email || '',
        name: shopData.name || ''
      })
      setProducts(productsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    if (filter === 'published' && !p.published) return false
    if (filter === 'draft' && p.published) return false
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const resetProductForm = () => {
    setProductForm({
      title: '',
      description: '',
      price: '',
      type: 'PRODUCT',
      category: '',
      condition: '',
      location: '',
      isGlobal: false,
      imageUrl: '',
      paymentMethods: [] as string[],
      paymentType: 'BOTH',
      acceptsRequests: false,
      acceptsOffers: true,
      published: true
    })
    setEditingProduct(null)
    setShowProductForm(false)
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...productForm,
      paymentMethods: productForm.paymentMethods.join(','),
      price: productForm.price ? parseFloat(productForm.price) : null
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        success(editingProduct ? 'Product updated!' : 'Product created!')
        fetchAll()
        resetProductForm()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save')
      }
    } catch (err) {
      error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Deleted')
        fetchAll()
      } else {
        error('Failed to delete')
      }
    } catch (err) {
      error('Failed to delete')
    }
  }

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      })
      if (res.ok) {
        success(!currentStatus ? 'Published!' : 'Hidden')
        fetchAll()
      } else {
        error('Failed to update')
      }
    } catch (err) {
      error('Failed to update')
    }
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      title: product.title,
      description: product.description || '',
      price: product.price?.toString() || '',
      type: product.type,
      category: product.category || '',
      condition: product.condition || '',
      location: product.location || '',
      isGlobal: product.isGlobal,
      imageUrl: product.imageUrl || '',
      paymentMethods: product.paymentMethods?.split(',').filter(Boolean) || [],
      paymentType: product.paymentType || 'BOTH',
      acceptsRequests: product.acceptsRequests,
      acceptsOffers: product.acceptsOffers,
      published: product.published
    })
    setShowProductForm(true)
  }

  const handleUnpublishShop = async () => {
    if (!confirm('Unpublish your shop? It will no longer appear in the directory. All products are preserved.')) return
    try {
      const res = await fetch('/api/shop?action=unpublish', { method: 'DELETE' })
      if (res.ok) {
        success('Shop unpublished')
        setShowShopModal(false)
        fetchAll()
      } else {
        error('Failed to unpublish shop')
      }
    } catch {
      error('Failed to unpublish shop')
    }
  }

  const handleDeleteShop = async () => {
    if (!confirm('Permanently delete your shop? This removes your shop name, description, and image. Your products will remain but will no longer be linked to a shop.')) return
    if (!confirm('Are you sure? This cannot be undone.')) return
    try {
      const res = await fetch('/api/shop?action=delete', { method: 'DELETE' })
      if (res.ok) {
        success('Shop deleted')
        setShopSettings(null)
        setShowShopModal(false)
        fetchAll()
      } else {
        error('Failed to delete shop')
      }
    } catch {
      error('Failed to delete shop')
    }
  }

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopForm)
      })

      if (res.ok) {
        success('Shop settings saved!')
        fetchAll()
        setShowShopModal(false)
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save')
      }
    } catch (err) {
      error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Marketplace' }
      ]} />
      
      <div className={styles.header}>
        <div>
          <h1>🛒 My Marketplace</h1>
          <p className={styles.welcome}>Manage your products & shop</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowShopModal(true)} className="btn-secondary">
            ⚙️ Shop Settings
          </button>
          <Link href="/products" className="btn-secondary">
            🌐 View Public
          </Link>
          <button onClick={() => { resetProductForm(); setShowProductForm(true) }} className="btn-primary">
            ➕ Add Product
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input 
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}>
          <option value="all">All Types</option>
          <option value="PRODUCT">Products</option>
          <option value="SERVICE">Services</option>
        </select>
        <span className={styles.filterCount}>{filteredProducts.length} items</span>
      </div>

      {filteredProducts.length === 0 && !showProductForm ? (
        <div className={styles.empty}>
          <p>No products yet. Add your first!</p>
          <button onClick={() => { resetProductForm(); setShowProductForm(true) }} className="btn-primary">➕ Add Product</button>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredProducts.map(product => (
            <div key={product.id} className={styles.item}>
              <div className={styles.itemImage}>
                {product.imageUrl ? <img src={product.imageUrl} alt={product.title} /> : <div className={styles.imagePlaceholder}>📦</div>}
              </div>
              <div className={styles.itemMain}>
                <div className={styles.itemHeader}>
                  <h3>{product.title}</h3>
                  <span className={`badge ${product.published ? 'badge-published' : 'badge-draft'}`}>
                    {product.published ? '✓ Published' : 'Draft'}
                  </span>
                </div>
                <p className={styles.itemDesc}>{product.description?.slice(0, 60) || 'No description'}</p>
                <div className={styles.itemMeta}>
                  <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                  {product.category && <span className="badge badge-category">{product.category}</span>}
                  <span>{product.price ? `$${product.price}` : 'Free'}</span>
                  <span>{product.isGlobal ? '🌍 Global' : `📍 ${product.location || 'Local'}`}</span>
                </div>
              </div>
              <div className={styles.itemActions}>
                <Link href={`/products/${product.id}`} className={styles.viewBtn}>👁️ View</Link>
                <button onClick={() => startEdit(product)} className={styles.editBtn}>✏️ Edit</button>
                <button onClick={() => handleTogglePublish(product.id, product.published)} className={product.published ? styles.hideBtn : styles.publishBtn}>
                  {product.published ? '👁️ Hide' : '✅ Publish'}
                </button>
                <button onClick={() => handleDelete(product.id, product.title)} className={styles.deleteBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showShopModal && (
        <div className="modal-overlay" onClick={() => setShowShopModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚙️ Shop Settings</h2>
            <form onSubmit={handleShopSubmit}>
              <div className="form-group">
                <label>Shop Name</label>
                <input type="text" value={shopForm.shopName} onChange={e => setShopForm({...shopForm, shopName: e.target.value})} placeholder="Your shop name" />
              </div>
              <div className="form-group">
                <label>About Your Shop</label>
                <textarea value={shopForm.shopAbout} onChange={e => setShopForm({...shopForm, shopAbout: e.target.value})} rows={3} placeholder="Tell customers about your shop..." />
              </div>
              <div className="form-group">
                <label>Shop Image URL</label>
                <input type="text" value={shopForm.shopImage} onChange={e => setShopForm({...shopForm, shopImage: e.target.value})} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Shop URL Slug</label>
                <input type="text" value={shopForm.shopSlug} onChange={e => setShopForm({...shopForm, shopSlug: e.target.value})} placeholder="my-shop" />
                <small style={{color: 'var(--text-secondary)'}}>xistrymemz.com/shop/{shopForm.shopSlug || 'your-slug'}</small>
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={shopForm.email} onChange={e => setShopForm({...shopForm, email: e.target.value})} placeholder="you@example.com" />
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowShopModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            </form>

            {shopSettings?.shopSlug && (
              <div className={styles.dangerZone}>
                <h3>Danger Zone</h3>
                <p>These actions affect your entire shop.</p>
                <div className={styles.dangerActions}>
                  <button onClick={handleUnpublishShop} className={styles.unpublishBtn}>
                    Unpublish Shop
                  </button>
                  <button onClick={handleDeleteShop} className={styles.deleteShopBtn}>
                    Delete Shop
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showProductForm && (
        <div className="modal-overlay" onClick={resetProductForm}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={productForm.title} onChange={e => setProductForm({...productForm, title: e.target.value})} placeholder="Product or service name" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})}>
                    <option value="PRODUCT">Product</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} placeholder="e.g., Electronics" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} rows={2} placeholder="Describe your product..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Condition</label>
                  <select value={productForm.condition} onChange={e => setProductForm({...productForm, condition: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input type="text" value={productForm.imageUrl} onChange={e => setProductForm({...productForm, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={productForm.isGlobal} onChange={e => setProductForm({...productForm, isGlobal: e.target.checked})} />
                  Available Globally
                </label>
              </div>
              {!productForm.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={productForm.location} onChange={e => setProductForm({...productForm, location: e.target.value})} placeholder="City, State" />
                </div>
              )}
              <div className="form-group">
                <label>Payment Methods</label>
                <div className={styles.paymentOptions}>
                  {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Crypto', 'Card'].map(method => (
                    <label key={method} className={styles.paymentCheckbox}>
                      <input type="checkbox" checked={productForm.paymentMethods.includes(method)} onChange={e => {
                        if (e.target.checked) setProductForm({...productForm, paymentMethods: [...productForm.paymentMethods, method]})
                        else setProductForm({...productForm, paymentMethods: productForm.paymentMethods.filter(m => m !== method)})
                      }} />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.toggles}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={productForm.acceptsRequests} onChange={e => setProductForm({...productForm, acceptsRequests: e.target.checked})} />
                  Allow Requests
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={productForm.acceptsOffers} onChange={e => setProductForm({...productForm, acceptsOffers: e.target.checked})} />
                  Accept Barter
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={productForm.published} onChange={e => setProductForm({...productForm, published: e.target.checked})} />
                  Publish Now
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={resetProductForm} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardMarketplace() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={styles.loading}>Loading...</div></div>}>
      <MarketplaceContent />
    </Suspense>
  )
}