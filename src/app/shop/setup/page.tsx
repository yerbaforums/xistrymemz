'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import FormWizard, { useWizard, type WizardStep } from '@/components/FormWizard'
import { businessTemplates, getTemplateById, type BusinessTemplate } from '@/lib/templates'
import { EmptyState } from '@/components/EmptyState'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

const steps: WizardStep[] = [
  { key: 'template', label: 'Choose Template', icon: '📋' },
  { key: 'profile', label: 'Shop Profile', icon: '🏪' },
  { key: 'products', label: 'Add Products', icon: '📦' },
  { key: 'payment', label: 'Payment Setup', icon: '💳' },
  { key: 'review', label: 'Review & Publish', icon: '✅' }
]

export default function SetupShopPage() {
  const { success, error } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const templateId = searchParams.get('template')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null)
  
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
    requestPrice: '',
    hashtags: ''
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
    published: true,
    hashtags: ''
  })

  const wizard = useWizard(steps)

  useEffect(() => {
    fetchShopData()
    if (templateId) {
      const template = getTemplateById(templateId)
      if (template) {
        setSelectedTemplate(template)
        setShopData({
          shopName: template.data.shopName || '',
          shopAbout: template.data.shopAbout || '',
          shopImage: template.data.shopImage || '',
          shopSlug: '',
          email: '',
          name: ''
        })
      }
    }
  }, [templateId])

  const fetchShopData = async () => {
    try {
      const [shopRes, productsRes] = await Promise.all([
        fetch('/api/shop'),
        fetch('/api/my-products')
      ])
      
      if (!shopRes.ok) throw new Error('Failed to fetch shop')
      if (!productsRes.ok) throw new Error('Failed to fetch products')
      
      const shopData = (await shopRes.json())?.data
      const prods = (await productsRes.json())?.data
      
      setShopData({
        shopName: shopData?.shopName || '',
        shopAbout: shopData?.shopAbout || '',
        shopImage: shopData?.shopImage || '',
        shopSlug: shopData?.shopSlug || '',
        email: shopData?.email || '',
        name: shopData?.name || ''
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
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
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
      handleImageUpload(file, 'shop', (url) => setShopData({ ...shopData, shopImage: url }))
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
        if (selectedTemplate?.sampleProducts && products.length === 0) {
          wizard.goNext()
        } else {
          fetchShopData()
        }
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
        hashtags: newProduct.hashtags ? newProduct.hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
        paymentMethods: newProduct.paymentMethods.join(','),
        price: newProduct.price ? parseFloat(newProduct.price) : undefined,
        requestPrice: newProduct.requestPrice ? parseFloat(newProduct.requestPrice) : undefined,
      }
      
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (res.ok) {
        setShowProductModal(false)
        setNewProduct({
          title: '', description: '', price: '', type: 'PRODUCT', category: '',
          condition: '', location: '', locationDetails: '', isGlobal: false,
          imageUrl: '', paymentMethods: [], paymentType: 'BOTH',
          acceptsRequests: false, acceptsOffers: true, requestPrice: '',
          hashtags: ''
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
      published: product.published,
      hashtags: (product as { hashtags?: { id: string; tag: string }[] }).hashtags?.map(h => h.tag).join(', ') || ''
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
        hashtags: editProduct.hashtags ? editProduct.hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
        paymentMethods: editProduct.paymentMethods.join(','),
        price: editProduct.price ? parseFloat(editProduct.price) : undefined,
        requestPrice: editProduct.requestPrice ? parseFloat(editProduct.requestPrice) : undefined,
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

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) fetchShopData()
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
      if (res.ok) fetchShopData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddSampleProducts = async () => {
    if (!selectedTemplate?.sampleProducts) return
    setSaving(true)
    try {
      for (const product of selectedTemplate.sampleProducts) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        })
      }
      success(`Added ${selectedTemplate.sampleProducts.length} sample products!`)
      fetchShopData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (wizard.currentStep === 'profile') {
      handleSaveShop()
    } else {
      wizard.goNext()
    }
  }

  const handleSubmit = async () => {
    if (!shopData.shopSlug) {
      await handleSaveShop()
    }
    success('Shop is ready!')
    setTimeout(() => {
      router.push(`/shop/${shopData.shopSlug || 'new'}`)
    }, 1000)
  }

  if (loading) {
    return <Skeleton width="100%" height="2rem" />
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Setup Shop' },
      ]} />
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <FormWizard
        steps={steps}
        currentStep={wizard.currentStep}
        onStepChange={wizard.setCurrentStep}
        onNext={handleNext}
        onBack={wizard.goBack}
        onSubmit={handleSubmit}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        loading={saving}
        submitLabel="Publish Shop"
      >
        {wizard.currentStep === 'template' && (
          <div className={styles.stepContent}>
            <h2>Choose a Template</h2>
            <p>Start with a pre-built template or create a blank shop</p>
            
            <div className={styles.templateGrid}>
              <div 
                className={`${styles.templateCard} ${!selectedTemplate ? styles.selected : ''}`}
                onClick={() => setSelectedTemplate(null)}
              >
                <div className={styles.templateIcon}>🏪</div>
                <div>
                  <h3>Blank Shop</h3>
                  <p>Start from scratch with a blank shop</p>
                </div>
              </div>
              
              {businessTemplates
                .filter(t => t.type === 'SHOP')
                .map(template => (
                  <div
                    key={template.id}
                    className={`${styles.templateCard} ${selectedTemplate?.id === template.id ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShopData({
                        shopName: template.data.shopName || '',
                        shopAbout: template.data.shopAbout || '',
                        shopImage: template.data.shopImage || '',
                        shopSlug: '',
                        email: '',
                        name: ''
                      })
                    }}
                  >
                    <div className={styles.templateIcon}>{template.icon}</div>
                    <div>
                      <h3>{template.name}</h3>
                      <span className={styles.category}>{template.category}</span>
                      <p>{template.description}</p>
                      {template.sampleProducts && (
                        <span className={styles.meta}>📦 {template.sampleProducts.length} sample products</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {wizard.currentStep === 'profile' && (
          <div className={styles.stepContent}>
            <h2>Shop Profile</h2>
            <p>Tell customers about your shop</p>
            
            <div className={styles.form}>
              <div className="form-group">
                <label>Shop Name *</label>
                <input
                  type="text"
                  value={shopData.shopName || ''}
                  onChange={e => setShopData({...shopData, shopName: e.target.value})}
                  placeholder="Your shop name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Shop Image</label>
                <div className={styles.imageUpload}>
                  <input type="file" ref={shopImageRef} onChange={handleShopImageChange} accept="image/*" className={styles.fileInput} />
                  <Button type="button" onClick={() => shopImageRef.current?.click()} className={styles.uploadBtn} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input type="text" value={shopData.shopImage || ''} onChange={e => setShopData({...shopData, shopImage: e.target.value})} placeholder="Or paste image URL" className={styles.urlInput} />
                </div>
                {shopData.shopImage && <img src={shopData.shopImage} alt="Shop preview" className={styles.imagePreview} />}
              </div>
              <div className="form-group">
                <label>About Your Shop</label>
                <textarea value={shopData.shopAbout || ''} onChange={e => setShopData({...shopData, shopAbout: e.target.value})} placeholder="Tell customers about your shop..." rows={4} />
              </div>
            </div>
          </div>
        )}

        {wizard.currentStep === 'products' && (
          <div className={styles.stepContent}>
            <div className={styles.sectionHeader}>
              <h2>Your Listings</h2>
              <Button onClick={() => setShowProductModal(true)} variant="primary">+ Add Listing</Button>
            </div>
            
            {selectedTemplate && !products.length && (
              <div className={styles.templatePrompt}>
                <p>This template includes sample products. Add them now?</p>
                <Button onClick={handleAddSampleProducts} variant="primary" disabled={saving}>
                  {saving ? 'Adding...' : `Add ${selectedTemplate.sampleProducts?.length || 0} Sample Products`}
                </Button>
              </div>
            )}
            
            {products.length === 0 ? (
              <EmptyState icon="🛒" title="No listings yet" description="Add your first product or service!" action={{ label: 'Add Listing', onClick: () => setShowProductModal(true) }} />
            ) : (
              <div className={styles.productGrid}>
                {products.map(product => (
                  <div key={product.id} className={styles.productCard}>
                    {product.imageUrl && <img src={product.imageUrl} alt={product.title} className={styles.productImage} />}
                    <div className={styles.productInfo}>
                      <h3>{product.title}</h3>
                      <p className={styles.productMeta}>
                        <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                        {product.price && <span className={styles.price}>${product.price}</span>}
                      </p>
                      <p className={styles.status}>{product.published ? '✓ Published' : 'Draft'}</p>
                      <div className={styles.productActions}>
                        <Button onClick={() => handleEditProduct(product)} className={styles.editBtn}>Edit</Button>
                        <Button onClick={() => handleTogglePublish(product.id, product.published)} className={product.published ? styles.unpublishBtn : styles.publishBtn}>
                          {product.published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button onClick={() => handleDeleteProduct(product.id)} className={styles.deleteBtn}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {wizard.currentStep === 'payment' && (
          <div className={styles.stepContent}>
            <h2>Payment Setup</h2>
            <p>Configure accepted payment methods for your shop</p>
            <div className={styles.infoBox}>
              <p>💡 You can configure payment methods for each product individually when adding listings.</p>
              <p>Supported methods: Cash, Venmo, PayPal, Zelle, Crypto, Card</p>
              <p>Payment types: Both (Escrow + Direct), Escrow Only, Direct Only</p>
            </div>
          </div>
        )}

        {wizard.currentStep === 'review' && (
          <div className={styles.stepContent}>
            <h2>Review & Publish</h2>
            <p>Review your shop details before publishing</p>
            
            <div className={styles.reviewSection}>
              <h3>Shop Profile</h3>
              <p><strong>Name:</strong> {shopData.shopName}</p>
              <p><strong>About:</strong> {shopData.shopAbout}</p>
              {shopData.shopImage && <img src={shopData.shopImage} alt="Shop" className={styles.reviewImage} />}
            </div>
            
            <div className={styles.reviewSection}>
              <h3>Listings ({products.length})</h3>
              {products.length === 0 ? (
                <p>No listings yet. You can add them after publishing.</p>
              ) : (
                <ul className={styles.reviewList}>
                  {products.map(p => (
                    <li key={p.id}>{p.title} - ${p.price} ({p.type})</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </FormWizard>

      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>Add New Listing</h2>
            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} placeholder="Item title" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Description" rows={3} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
                    <option value="PRODUCT">Product</option>
                    <option value="RENTAL">Rental</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g., Electronics, Cleaning" />
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select value={newProduct.condition} onChange={e => setNewProduct({...newProduct, condition: e.target.value})}>
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
                  <input type="file" ref={productImageRef} onChange={(e) => handleProductImageChange(e, false)} accept="image/*" className={styles.fileInput} />
                  <Button type="button" onClick={() => productImageRef.current?.click()} className={styles.uploadBtn} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input type="text" value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} placeholder="Or paste image URL" className={styles.urlInput} />
                </div>
                {newProduct.imageUrl && <img src={newProduct.imageUrl} alt="Preview" className={styles.imagePreview} />}
              </div>
              <div className="form-group">
                <label>Hashtags</label>
                <input type="text" value={newProduct.hashtags} onChange={e => setNewProduct({...newProduct, hashtags: e.target.value})} placeholder="e.g. tech, vintage, handmade (comma separated)" />
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={newProduct.isGlobal} onChange={e => setNewProduct({...newProduct, isGlobal: e.target.checked})} />
                  Available Globally
                </label>
              </div>
              {!newProduct.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={newProduct.location} onChange={e => setNewProduct({...newProduct, location: e.target.value})} placeholder="City, State" />
                </div>
              )}
              <div className="form-group">
                <label>Payment Methods</label>
                <div className={styles.paymentOptions}>
                  {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Crypto', 'Card'].map(method => (
                    <label key={method} className={styles.paymentCheckbox}>
                      <input type="checkbox" checked={newProduct.paymentMethods.includes(method)} onChange={e => {
                        if (e.target.checked) {
                          setNewProduct({...newProduct, paymentMethods: [...newProduct.paymentMethods, method]})
                        } else {
                          setNewProduct({...newProduct, paymentMethods: newProduct.paymentMethods.filter(m => m !== method)})
                        }
                      }} />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Payment Type</label>
                <select value={newProduct.paymentType} onChange={e => setNewProduct({...newProduct, paymentType: e.target.value})}>
                  <option value="BOTH">Both (Escrow + Direct)</option>
                  <option value="ESCROW">Escrow Only</option>
                  <option value="DIRECT">Direct Only</option>
                </select>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={newProduct.acceptsRequests} onChange={e => setNewProduct({...newProduct, acceptsRequests: e.target.checked})} />
                  Allow via Project Requests
                </label>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={newProduct.acceptsOffers} onChange={e => setNewProduct({...newProduct, acceptsOffers: e.target.checked})} />
                  Accept Barter Offers
                </label>
              </div>
              <div className={styles.modalActions}>
                <Button type="button" onClick={() => setShowProductModal(false)} variant="ghost">Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Listing'}
                </Button>
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
                <input type="text" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Item title" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Description" rows={3} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={editProduct.type} onChange={e => setEditProduct({...editProduct, type: e.target.value})}>
                    <option value="PRODUCT">Product</option>
                    <option value="RENTAL">Rental</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value})} placeholder="e.g., Electronics, Cleaning" />
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select value={editProduct.condition} onChange={e => setEditProduct({...editProduct, condition: e.target.value})}>
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
                  <input type="file" onChange={(e) => handleProductImageChange(e, true)} accept="image/*" className={styles.fileInput} />
                  <Button type="button" onClick={(e) => (e.target as HTMLButtonElement).previousElementSibling?.dispatchEvent(new MouseEvent('click'))} className={styles.uploadBtn} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input type="text" value={editProduct.imageUrl} onChange={e => setEditProduct({...editProduct, imageUrl: e.target.value})} placeholder="Or paste image URL" className={styles.urlInput} />
                </div>
                {editProduct.imageUrl && <img src={editProduct.imageUrl} alt="Preview" className={styles.imagePreview} />}
              </div>
              <div className="form-group">
                <label>Hashtags</label>
                <input type="text" value={editProduct.hashtags} onChange={e => setEditProduct({...editProduct, hashtags: e.target.value})} placeholder="e.g. tech, vintage, handmade (comma separated)" />
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={editProduct.isGlobal} onChange={e => setEditProduct({...editProduct, isGlobal: e.target.checked})} />
                  Available Globally
                </label>
              </div>
              {!editProduct.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={editProduct.location} onChange={e => setEditProduct({...editProduct, location: e.target.value})} placeholder="City, State" />
                </div>
              )}
              <div className="form-group">
                <label>Payment Methods</label>
                <div className={styles.paymentOptions}>
                  {['Cash', 'Venmo', 'PayPal', 'Zelle', 'Crypto', 'Card'].map(method => (
                    <label key={method} className={styles.paymentCheckbox}>
                      <input type="checkbox" checked={editProduct.paymentMethods.includes(method)} onChange={e => {
                        if (e.target.checked) {
                          setEditProduct({...editProduct, paymentMethods: [...editProduct.paymentMethods, method]})
                        } else {
                          setEditProduct({...editProduct, paymentMethods: editProduct.paymentMethods.filter(m => m !== method)})
                        }
                      }} />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={editProduct.acceptsRequests} onChange={e => setEditProduct({...editProduct, acceptsRequests: e.target.checked})} />
                  Allow via Project Requests
                </label>
              </div>
              <div className="form-group">
                <label>Payment Type</label>
                <select value={editProduct.paymentType} onChange={e => setEditProduct({...editProduct, paymentType: e.target.value})}>
                  <option value="BOTH">Both (Escrow + Direct)</option>
                  <option value="ESCROW">Escrow Only (Protected)</option>
                  <option value="DIRECT">Direct Payment Only</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <Button type="button" onClick={() => setShowEditModal(false)} variant="ghost">Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Listing"
        message="Delete this listing permanently?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
