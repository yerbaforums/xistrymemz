'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import Loading from '@/components/Loading'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import type { DonationAddr } from '@/types/product'
import ImageUploader from '@/components/ImageUploader'
import { useTranslations } from 'next-intl'
import { SHOP_CATEGORIES } from '@/lib/shop-categories'
import { PRODUCT_CONDITIONS, PRODUCT_TYPES } from '@/lib/product-categories'

import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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
  rentalDaily: number | null
  rentalWeekly: number | null
  rentalMonthly: number | null
  rentalDeposit: number | null
  rentalMinDays: number
  rentalMaxDays: number | null
  rentalAvailable: boolean
  hashtags?: { id: string; tag: string }[]
  acceptsAppointments?: boolean
  appointmentDuration?: number | null
  appointmentLeadTime?: number | null
  appointmentLocation?: string | null
  appointmentMeetingLink?: string | null
  appointmentFormFields?: { label: string; type: string; required: boolean }[] | null
  acceptsDonations?: boolean
  donationAddress?: string | null
  donationCurrency?: string | null
  donationAddresses?: string | null
  sellerPayoutAddress?: string | null
  sellerCryptoCurrency?: string | null
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
  const t = useTranslations('dashboard')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { success, error } = useToast()
  const editId = searchParams.get('edit')
  const isNew = searchParams.get('new') === 'true'
  
  const [products, setProducts] = useState<Product[]>([])
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [typeFilter] = useState<'all' | 'PRODUCT'>('PRODUCT')
  const [search, setSearch] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showShopModal, setShowShopModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'delete-item' | 'unpublish-shop' | 'delete-shop' | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const userDonationAddrs = useDonationAddresses()
  const { settings } = useSiteSettings()

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
    imageUrls: [] as string[],
    paymentMethods: [] as string[],
    paymentType: 'BOTH',
    acceptsRequests: false,
    acceptsOffers: true,
    published: true,
    hashtags: '',
    acceptsDonations: false,
    selectedDonationAddrs: [] as DonationAddr[],
    sellerPayoutAddress: '',
    sellerCryptoCurrency: 'ETH',
  })

  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopAbout: '',
    shopImage: '',
    shopImages: [] as string[],
    shopSlug: '',
    shopCategory: 'OTHER',
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
          imageUrls: product.imageUrl ? [product.imageUrl] : [] as string[],
          paymentMethods: product.paymentMethods?.split(',').filter(Boolean) || [],
          paymentType: product.paymentType || 'BOTH',
          acceptsRequests: product.acceptsRequests,
          acceptsOffers: product.acceptsOffers,
          published: product.published,
          hashtags: product.hashtags?.map(h => h.tag).join(', ') || '',
          acceptsDonations: product.acceptsDonations || false,
          selectedDonationAddrs: hydrateDonationAddresses(product.donationAddress, product.donationCurrency, product.donationAddresses),
          sellerPayoutAddress: product.sellerPayoutAddress || '',
          sellerCryptoCurrency: product.sellerCryptoCurrency || 'ETH',
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
        shopImages: shopData.shopImage ? [shopData.shopImage] : [] as string[],
        shopSlug: shopData.shopSlug || '',
        shopCategory: shopData.shopCategory || 'OTHER',
        email: shopData.email || '',
        name: shopData.name || ''
      })
      setProducts(productsData?.items || [])
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
      imageUrls: [] as string[],
      paymentMethods: [] as string[],
      paymentType: 'BOTH',
      acceptsRequests: false,
      acceptsOffers: true,
      published: true,
      hashtags: '',
      acceptsDonations: false,
      selectedDonationAddrs: [] as DonationAddr[],
      sellerPayoutAddress: '',
      sellerCryptoCurrency: 'ETH',
    })
    setEditingProduct(null)
    setShowProductForm(false)
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...productForm,
      hashtags: productForm.hashtags ? productForm.hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
      paymentMethods: productForm.paymentMethods.join(','),
      price: productForm.price ? parseFloat(productForm.price) : null,
      imageUrl: productForm.imageUrls?.[0] || null,
      
      ...donationAddressesToLegacy(productForm.acceptsDonations ? productForm.selectedDonationAddrs : []),
      donationAddresses: productForm.acceptsDonations ? serializeDonationAddresses(productForm.selectedDonationAddrs) : null,
      sellerPayoutAddress: productForm.sellerPayoutAddress || null,
      sellerCryptoCurrency: productForm.sellerCryptoCurrency || 'ETH',
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

  const handleDelete = async () => {
    try {
      if (!confirmAction || confirmAction !== 'delete-item') return;
      const res = await fetch(`/api/products/${confirmTitle}`, { method: 'DELETE' })
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
      imageUrls: product.imageUrl ? [product.imageUrl] : [] as string[],
      paymentMethods: product.paymentMethods?.split(',').filter(Boolean) || [],
      paymentType: product.paymentType || 'BOTH',
      acceptsRequests: product.acceptsRequests,
      acceptsOffers: product.acceptsOffers,
      published: product.published,
      hashtags: product.hashtags?.map(h => h.tag).join(', ') || '',
      acceptsDonations: product.acceptsDonations || false,
      selectedDonationAddrs: hydrateDonationAddresses(product.donationAddress, product.donationCurrency, product.donationAddresses),
      sellerPayoutAddress: product.sellerPayoutAddress || '',
      sellerCryptoCurrency: product.sellerCryptoCurrency || 'ETH',
    })
    setShowProductForm(true)
  }

  const handleUnpublishShop = async () => {
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
        body: JSON.stringify({ ...shopForm, shopImage: shopForm.shopImages?.[0] || null })
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
    return <div className={styles.page}><div className={styles.loading}>{t('loading')}</div></div>
  }

  return (
    <div className={styles.page}>
      
      <div className={styles.header}>
        <div>
          <h1>🛒 {t('marketplace')}</h1>
          <p className={styles.welcome}>Manage your products & shop</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowShopModal(true)} className="btn-secondary">
            ⚙️ {t('settings')}
          </button>
          <Link href="/products" className="btn-secondary">
            🌐 View Public
          </Link>
          <button onClick={() => { resetProductForm(); setShowProductForm(true) }} className="btn-primary">
            ➕ {t('products')}
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
        <span className={styles.filterCount}>{filteredProducts.length} items</span>
      </div>

      {filteredProducts.length === 0 && !showProductForm ? (
        <EmptyState icon="🛒" title="No products yet" description="List your first product to start selling." action={{ label: 'Add Product', onClick: () => router.push('/products/new') }} />
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
                <p className={styles.itemDesc}>{product.description?.slice(0, 60) || t('noDescription')}</p>
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
            <h2>⚙️ {t('settings')}</h2>
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
                <label>Shop Image</label>
                <ImageUploader images={shopForm.shopImages || []} onChange={(urls) => setShopForm({...shopForm, shopImages: urls})} maxImages={1} />
              </div>
              <div className="form-group">
                <label>Shop URL Slug</label>
                <input type="text" value={shopForm.shopSlug} onChange={e => setShopForm({...shopForm, shopSlug: e.target.value})} placeholder="my-shop" />
                <small style={{color: 'var(--text-secondary)'}}>xistrymemz.xyz/shop/{shopForm.shopSlug || 'your-slug'}</small>
              </div>
              <div className="form-group">
                <label>Shop Category</label>
                <select value={shopForm.shopCategory} onChange={e => setShopForm({...shopForm, shopCategory: e.target.value})}>
                  {SHOP_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
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
                  <button onClick={() => setConfirmAction('unpublish-shop')} className={styles.unpublishBtn}>
                    Unpublish Shop
                  </button>
                  <button onClick={() => setConfirmAction('delete-shop')} className={styles.deleteShopBtn}>
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
            <h2>{editingProduct ? '✏️ ' + t('products') : '➕ ' + t('products')}</h2>
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={productForm.title} onChange={e => setProductForm({...productForm, title: e.target.value})} placeholder="Product or service name" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})}>
                    {PRODUCT_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
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
              <div className="form-group">
                <label>Hashtags</label>
                <input type="text" value={productForm.hashtags} onChange={e => setProductForm({...productForm, hashtags: e.target.value})} placeholder="e.g. tech, vintage, handmade (comma separated)" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Condition</label>
                  <select value={productForm.condition} onChange={e => setProductForm({...productForm, condition: e.target.value})}>
                    <option value="">Select...</option>
                    {PRODUCT_CONDITIONS.map(c => (
                      <option key={c} value={c}>{c.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Image</label>
                  <ImageUploader images={productForm.imageUrls || []} onChange={(urls) => setProductForm({...productForm, imageUrls: urls})} maxImages={1} />
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
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={productForm.acceptsDonations} onChange={e => setProductForm({...productForm, acceptsDonations: e.target.checked})} />
                Accept Donations
              </label>
              {productForm.acceptsDonations && (
                <DonationAddressPicker
                  savedAddresses={userDonationAddrs}
                  selectedAddresses={productForm.selectedDonationAddrs}
                  onAddressesChange={(addrs) => setProductForm({...productForm, selectedDonationAddrs: addrs})}
                />
              )}
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
      <ConfirmDialog
        isOpen={confirmAction === 'delete-item'}
        onClose={() => { setConfirmAction(null); setConfirmTitle('') }}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Permanently delete this product? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'unpublish-shop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleUnpublishShop}
        title="Unpublish Shop"
        message="Your shop will no longer appear in the directory. All products are preserved."
        confirmLabel="Unpublish"
        variant="warning"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'delete-shop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeleteShop}
        title="Delete Shop"
        message="This permanently removes your shop name, description, and image. Your products will remain but will no longer be linked to a shop. This cannot be undone."
        confirmLabel="Delete Shop"
        variant="danger"
      />
    </div>
  )
}

export default function DashboardMarketplace() {
  return (
    <Suspense fallback={<Loading size="medium" />}>
      <MarketplaceContent />
    </Suspense>
  )
}