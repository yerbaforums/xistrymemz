'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'
import styles from './page.module.css'

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

function ShopListingsContent() {
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  const editId = searchParams.get('edit')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (editId) {
      const product = products.find(p => p.id === editId)
      if (product) {
        setEditingProduct(product)
        setFormData({
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
        setShowForm(true)
      }
    }
  }, [editId, products])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products/user')
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    if (filter === 'published' && !p.published) return false
    if (filter === 'draft' && p.published) return false
    return true
  })

  const resetForm = () => {
    setFormData({
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
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...formData,
      paymentMethods: formData.paymentMethods.join(','),
      price: formData.price ? parseFloat(formData.price) : null
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
        success(editingProduct ? 'Listing updated!' : 'Listing created!')
        fetchProducts()
        resetForm()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save')
      }
    } catch (err) {
      error('Failed to save listing')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Listing deleted')
        fetchProducts()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to delete')
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
        success(!currentStatus ? 'Now published!' : 'Now hidden')
        fetchProducts()
      } else {
        error('Failed to update')
      }
    } catch (err) {
      error('Failed to update')
    }
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
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
    setShowForm(true)
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Shop', href: '/shop/setup' },
        { label: 'My Listings' }
      ]} />

      <div className={styles.header}>
        <div>
          <h1>📦 My Listings</h1>
          <p className={styles.welcome}>Manage your products and services</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/dashboard/marketplace" className="btn-secondary">📊 Dashboard</Link>
          <Link href="/shop/setup" className="btn-secondary">⚙️ Shop Settings</Link>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            ➕ Add Listing
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <span className={styles.count}>{filteredProducts.length} listings</span>
      </div>

      {showForm && (
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <h2>{editingProduct ? '✏️ Edit Listing' : '➕ New Listing'}</h2>
            <button onClick={resetForm} className={styles.closeBtn}>✕</button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Item title"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Description"
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="PRODUCT">Product</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g., Electronics"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Condition</label>
                <select
                  value={formData.condition}
                  onChange={e => setFormData({...formData, condition: e.target.value})}
                >
                  <option value="">Select...</option>
                  <option value="NEW">New</option>
                  <option value="LIKE_NEW">Like New</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                </select>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="form-group">
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isGlobal}
                  onChange={e => setFormData({...formData, isGlobal: e.target.checked})}
                />
                Available Globally
              </label>
            </div>
            {!formData.isGlobal && (
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="City, State"
                />
              </div>
            )}
            <div className="form-group">
              <label>Payment Methods</label>
              <div className={styles.paymentOptions}>
                {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Crypto', 'Card'].map(method => (
                  <label key={method} className={styles.paymentCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.paymentMethods.includes(method)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData({...formData, paymentMethods: [...formData.paymentMethods, method]})
                        } else {
                          setFormData({...formData, paymentMethods: formData.paymentMethods.filter(m => m !== method)})
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
                value={formData.paymentType}
                onChange={e => setFormData({...formData, paymentType: e.target.value})}
              >
                <option value="BOTH">Both</option>
                <option value="ESCROW">Escrow Only</option>
                <option value="DIRECT">Direct Only</option>
              </select>
            </div>
            <div className={styles.toggles}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.acceptsRequests}
                  onChange={e => setFormData({...formData, acceptsRequests: e.target.checked})}
                />
                Allow via Requests
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.acceptsOffers}
                  onChange={e => setFormData({...formData, acceptsOffers: e.target.checked})}
                />
                Accept Barter
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={e => setFormData({...formData, published: e.target.checked})}
                />
                Publish Now
              </label>
            </div>
            <div className={styles.formActions}>
              <button type="button" onClick={resetForm} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <p>No listings yet. Create your first product or service!</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            ➕ Add Listing
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredProducts.map(product => (
            <div key={product.id} className={styles.item}>
              <div className={styles.itemImage}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} />
                ) : (
                  <div className={styles.imagePlaceholder}>📦</div>
                )}
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
                <Link href={`/products/${product.id}`} className={styles.viewBtn}>
                  👁️ View
                </Link>
                <button onClick={() => startEdit(product)} className={styles.editBtn}>
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => handleTogglePublish(product.id, product.published)}
                  className={product.published ? styles.hideBtn : styles.publishBtn}
                >
                  {product.published ? '👁️ Hide' : '✅ Publish'}
                </button>
                <button 
                  onClick={() => handleDelete(product.id, product.title)}
                  className={styles.deleteBtn}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ShopListingsPage() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={styles.loading}>Loading...</div></div>}>
      <ShopListingsContent />
    </Suspense>
  )
}