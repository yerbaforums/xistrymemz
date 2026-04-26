'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

interface ShopData {
  shopName: string | null
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string | null
  email: string | null
  name: string | null
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
  published: boolean
  paymentMethods: string | null
  acceptsRequests: boolean
  requestPrice: number | null
}

export default function SetupShopPage() {
  const { success, error, warning } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [shopData, setShopData] = useState<ShopData>({
    shopName: '',
    shopAbout: '',
    shopImage: '',
    shopSlug: '',
    email: '',
    name: ''
  })
  const [products, setProducts] = useState<Product[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const shopImageRef = useRef<HTMLInputElement>(null)
  const productImageRef = useRef<HTMLInputElement>(null)

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
    acceptsRequests: false,
    acceptsOffers: true,
    requestPrice: ''
  })

  const [editProduct, setEditProduct] = useState({
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
    acceptsRequests: false,
    requestPrice: '',
    published: true
  })

  useEffect(() => {
    fetchShopData()
  }, [])

  const fetchShopData = async () => {
    try {
      const [shopRes, productsRes] = await Promise.all([
        fetch('/api/shop'),
        fetch('/api/my-products')
      ])
      
      if (!shopRes.ok) throw new Error('Failed to fetch shop')
      if (!productsRes.ok) throw new Error('Failed to fetch products')
      
      const shop = await shopRes.json()
      const prods = await productsRes.json()
      
      setShopData({
        shopName: shop.shopName || '',
        shopAbout: shop.shopAbout || '',
        shopImage: shop.shopImage || '',
        shopSlug: shop.shopSlug || '',
        email: shop.email || '',
        name: shop.name || ''
      })
      setProducts(prods || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'shop' | 'product', callback: (url: string) => void) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      const data = await res.json()
      if (data.url) {
        callback(data.url)
        success('Image uploaded!')
      }
    } catch (err) {
      console.error(err)
      error('Failed to upload image. Try using an image URL instead.')
    } finally {
      setUploading(false)
    }
  }

  const handleShopImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, 'shop', (url) => {
        setShopData({ ...shopData, shopImage: url })
      })
    }
  }

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, 'product', (url) => {
        if (isEdit) {
          setEditProduct({ ...editProduct, imageUrl: url })
        } else {
          setNewProduct({ ...newProduct, imageUrl: url })
        }
      })
    }
  }

  const handleSaveShop = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopData)
      })

      if (res.ok) {
        success('Shop settings saved!')
        fetchShopData()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const productData = {
        ...newProduct,
        paymentMethods: newProduct.paymentMethods.join(',')
      }
      
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (res.ok) {
        setShowProductModal(false)
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
          acceptsRequests: false,
          acceptsOffers: true,
          requestPrice: ''
        })
        fetchShopData()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create product')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditProduct({
      title: product.title,
      description: product.description || '',
      price: product.price?.toString() || '',
      type: product.type,
      category: product.category || '',
      condition: product.condition || '',
      location: product.location || '',
      locationDetails: product.locationDetails || '',
      isGlobal: product.isGlobal,
      imageUrl: product.imageUrl || '',
      paymentMethods: product.paymentMethods ? product.paymentMethods.split(',') : [],
      paymentType: (product as { paymentType?: string }).paymentType || 'BOTH',
      acceptsRequests: product.acceptsRequests,
      requestPrice: product.requestPrice?.toString() || '',
      published: product.published
    })
    setShowEditModal(true)
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    
    setSaving(true)
    try {
      const productData = {
        ...editProduct,
        paymentMethods: editProduct.paymentMethods.join(',')
      }
      
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (res.ok) {
        setShowEditModal(false)
        setEditingProduct(null)
        fetchShopData()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update product')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this listing?')) return
    
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchShopData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTogglePublish = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !current })
      })
      if (res.ok) {
        fetchShopData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.header}>
        <h1>Setup Your Shop</h1>
        <p className={styles.subtitle}>Configure your marketplace profile and listings</p>
      </div>

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2>Shop Profile</h2>
          <div className={styles.form}>
            <div className="form-group">
              <label>Shop Name</label>
              <input
                type="text"
                value={shopData.shopName || ''}
                onChange={e => setShopData({...shopData, shopName: e.target.value})}
                placeholder="Your shop name"
              />
            </div>
            <div className="form-group">
              <label>Shop Image</label>
              <div className={styles.imageUpload}>
                <input
                  type="file"
                  ref={shopImageRef}
                  onChange={handleShopImageChange}
                  accept="image/*"
                  className={styles.fileInput}
                />
                <button 
                  type="button" 
                  onClick={() => shopImageRef.current?.click()}
                  className={styles.uploadBtn}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
                <input
                  type="text"
                  value={shopData.shopImage || ''}
                  onChange={e => setShopData({...shopData, shopImage: e.target.value})}
                  placeholder="Or paste image URL"
                  className={styles.urlInput}
                />
              </div>
              {shopData.shopImage && (
                <img src={shopData.shopImage} alt="Shop preview" className={styles.imagePreview} />
              )}
            </div>
            <div className="form-group">
              <label>About Your Shop</label>
              <textarea
                value={shopData.shopAbout || ''}
                onChange={e => setShopData({...shopData, shopAbout: e.target.value})}
                placeholder="Tell customers about your shop..."
                rows={4}
              />
            </div>
            <button onClick={handleSaveShop} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Shop Settings'}
            </button>
            {shopData.shopSlug && (
              <a 
                href={`/shop/${shopData.shopSlug}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.previewBtn}
              >
                Preview Shop
              </a>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Your Listings</h2>
            <button onClick={() => setShowProductModal(true)} className="btn-primary">
              + Add Listing
            </button>
          </div>
          
          {products.length === 0 ? (
            <div className={styles.empty}>
              <p>No listings yet. Add your first product or service!</p>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {products.map(product => (
                <div key={product.id} className={styles.productCard}>
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.title} className={styles.productImage} />
                  )}
                  <div className={styles.productInfo}>
                    <h3>{product.title}</h3>
                    <p className={styles.productMeta}>
                      <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                      {product.price && <span className={styles.price}>${product.price}</span>}
                    </p>
                    <p className={styles.status}>
                      {product.published ? '✓ Published' : 'Draft'}
                    </p>
                    <div className={styles.productActions}>
                      <a 
                        href={`/products/${product.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.previewLinkBtn}
                      >
                        Preview
                      </a>
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className={styles.editBtn}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleTogglePublish(product.id, product.published)}
                        className={product.published ? styles.unpublishBtn : styles.publishBtn}
                      >
                        {product.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Add New Listing</h2>
            <form onSubmit={handleCreateProduct}>
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
                <label>Image</label>
                <div className={styles.imageUpload}>
                  <input
                    type="file"
                    ref={productImageRef}
                    onChange={(e) => handleProductImageChange(e, false)}
                    accept="image/*"
                    className={styles.fileInput}
                  />
                  <button 
                    type="button" 
                    onClick={() => productImageRef.current?.click()}
                    className={styles.uploadBtn}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                  <input
                    type="text"
                    value={newProduct.imageUrl}
                    onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                    placeholder="Or paste image URL"
                    className={styles.urlInput}
                  />
                </div>
                {newProduct.imageUrl && (
                  <img src={newProduct.imageUrl} alt="Preview" className={styles.imagePreview} />
                )}
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newProduct.isGlobal}
                    onChange={e => setNewProduct({...newProduct, isGlobal: e.target.checked})}
                  />
                  Available Globally
                </label>
              </div>
              {!newProduct.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={newProduct.location}
                    onChange={e => setNewProduct({...newProduct, location: e.target.value})}
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
                  <option value="ESCROW">Escrow Only</option>
                  <option value="DIRECT">Direct Only</option>
                </select>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newProduct.acceptsRequests}
                    onChange={e => setNewProduct({...newProduct, acceptsRequests: e.target.checked})}
                  />
                  Allow via Project Requests
                </label>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newProduct.acceptsOffers}
                    onChange={e => setNewProduct({...newProduct, acceptsOffers: e.target.checked})}
                  />
                  Accept Barter Offers
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowProductModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingProduct && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Edit Listing</h2>
            <form onSubmit={handleUpdateProduct}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={editProduct.title}
                  onChange={e => setEditProduct({...editProduct, title: e.target.value})}
                  placeholder="Item title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editProduct.description}
                  onChange={e => setEditProduct({...editProduct, description: e.target.value})}
                  placeholder="Description"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={editProduct.type}
                    onChange={e => setEditProduct({...editProduct, type: e.target.value})}
                  >
                    <option value="PRODUCT">Product</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    value={editProduct.price}
                    onChange={e => setEditProduct({...editProduct, price: e.target.value})}
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
                    value={editProduct.category}
                    onChange={e => setEditProduct({...editProduct, category: e.target.value})}
                    placeholder="e.g., Electronics, Cleaning"
                  />
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={editProduct.condition}
                    onChange={e => setEditProduct({...editProduct, condition: e.target.value})}
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
                <label>Image</label>
                <div className={styles.imageUpload}>
                  <input
                    type="file"
                    onChange={(e) => handleProductImageChange(e, true)}
                    accept="image/*"
                    className={styles.fileInput}
                  />
                  <button 
                    type="button" 
                    onClick={(e) => (e.target as HTMLButtonElement).previousElementSibling?.dispatchEvent(new MouseEvent('click'))}
                    className={styles.uploadBtn}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                  <input
                    type="text"
                    value={editProduct.imageUrl}
                    onChange={e => setEditProduct({...editProduct, imageUrl: e.target.value})}
                    placeholder="Or paste image URL"
                    className={styles.urlInput}
                  />
                </div>
                {editProduct.imageUrl && (
                  <img src={editProduct.imageUrl} alt="Preview" className={styles.imagePreview} />
                )}
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editProduct.isGlobal}
                    onChange={e => setEditProduct({...editProduct, isGlobal: e.target.checked})}
                  />
                  Available Globally
                </label>
              </div>
              {!editProduct.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={editProduct.location}
                    onChange={e => setEditProduct({...editProduct, location: e.target.value})}
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
                        checked={editProduct.paymentMethods.includes(method)}
                        onChange={e => {
                          if (e.target.checked) {
                            setEditProduct({...editProduct, paymentMethods: [...editProduct.paymentMethods, method]})
                          } else {
                            setEditProduct({...editProduct, paymentMethods: editProduct.paymentMethods.filter(m => m !== method)})
                          }
                        }}
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editProduct.acceptsRequests}
                    onChange={e => setEditProduct({...editProduct, acceptsRequests: e.target.checked})}
                  />
                  Allow via Project Requests
                </label>
              </div>
              <div className="form-group">
                <label>Payment Type</label>
                <select
                  value={editProduct.paymentType}
                  onChange={e => setEditProduct({...editProduct, paymentType: e.target.value})}
                >
                  <option value="BOTH">Both (Escrow + Direct)</option>
                  <option value="ESCROW">Escrow Only (Protected)</option>
                  <option value="DIRECT">Direct Payment Only</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
