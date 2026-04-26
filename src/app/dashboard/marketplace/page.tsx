'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'
import styles from '../page.module.css'

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
  createdAt: string
}

export default function DashboardMarketplace() {
  const router = useRouter()
  const { success, error } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'PRODUCT' | 'SERVICE'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [filter, typeFilter])

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
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Product deleted')
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
        success(!currentStatus ? 'Product published!' : 'Product unpublished')
        fetchProducts()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update')
      }
    } catch (err) {
      error('Failed to update')
    }
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Products' }
      ]} />
      
      <div className={styles.header}>
        <div>
          <h1>🛒 My Products</h1>
          <p className={styles.welcome}>Manage your listings</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/shop/setup" className="btn-secondary">⚙️ Shop Settings</Link>
          <Link href="/products" className="btn-secondary">🌐 Public View</Link>
          <Link href="/shop/setup" className="btn-primary">➕ New Product</Link>
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

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <p>{filter === 'all' ? "You haven't listed any products or services yet." : `No ${filter} products found.`}</p>
          <Link href="/shop/setup" className="btn-primary">➕ Create Your First Product</Link>
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
                <p className={styles.itemDesc}>{product.description?.slice(0, 80) || 'No description'}</p>
                <div className={styles.itemMeta}>
                  <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                  {product.category && <span className="badge badge-category">{product.category}</span>}
                  {product.condition && <span className="badge badge-condition">{product.condition}</span>}
                </div>
                <div className={styles.itemStats}>
                  <span>{product.isGlobal ? '🌍 Global' : `📍 ${product.location || 'Local'}`}</span>
                  <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={styles.itemSide}>
                <span className={styles.price}>${product.price || '0'}</span>
                <div className={styles.itemActions}>
                  <button 
                    onClick={() => handleTogglePublish(product.id, product.published)}
                    className={product.published ? styles.unpublishBtn : styles.publishBtn}
                  >
                    {product.published ? '👁️ Hide' : '✅ Publish'}
                  </button>
                  <Link href={`/products/${product.id}`} className={styles.viewBtn}>
                    👁️ View
                  </Link>
                  <Link href={`/shop/setup?edit=${product.id}`} className={styles.editBtn}>
                    ✏️ Edit
                  </Link>
                  <button 
                    onClick={() => handleDelete(product.id, product.title)}
                    className={styles.deleteBtn}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
