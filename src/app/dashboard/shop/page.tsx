'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import ImageUploader from '@/components/ImageUploader'

import styles from './shop.module.css'
import Loading from '@/components/Loading'
import Skeleton from '@/components/Skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface ShopData {
  shopName: string | null
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string | null
  email: string | null
  name: string | null
}

type DeleteAction = 'unpublish' | 'delete'

export default function ShopDashboard() {
  const { success, error } = useToast()
  const router = useRouter()
  const [shop, setShop] = useState<ShopData | null>(null)
  const [stats, setStats] = useState({ products: 0, services: 0, rentals: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteAction | null>(null)
  const [form, setForm] = useState({
    shopName: '', shopAbout: '', shopImage: '', shopImages: [] as string[],
    shopSlug: '', email: '', name: ''
  })

  useEffect(() => { fetchShop() }, [])

  const fetchShop = async () => {
    try {
      const [shopRes, productsRes, servicesRes] = await Promise.all([
        fetch('/api/shop'),
        fetch('/api/products/user'),
        fetch('/api/services/user')
      ])
      const shopData = await shopRes.json()
      const productsData = await productsRes.json()
      const servicesData = await servicesRes.json()
      setShop(shopData)
      setForm({
        shopName: shopData.shopName || '',
        shopAbout: shopData.shopAbout || '',
        shopImage: shopData.shopImage || '',
        shopImages: shopData.shopImage ? [shopData.shopImage] : [],
        shopSlug: shopData.shopSlug || '',
        email: shopData.email || '',
        name: shopData.name || ''
      })
      const products = Array.isArray(productsData) ? productsData : productsData?.items || productsData?.products || []
      const services = servicesData?.data?.services || servicesData?.services || []
      setStats({
        products: products.filter((p: any) => p.type === 'PRODUCT').length,
        services: services.length,
        rentals: products.filter((p: any) => p.type === 'RENTAL').length,
      })
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, shopImage: form.shopImages?.[0] || null })
      })
      if (res.ok) { success('Shop saved!'); setEditing(false); fetchShop() }
      else { const err = await res.json(); error(err.error || 'Failed to save') }
    } catch { error('Failed to save') }
    setSaving(false)
  }

  const handleUnpublish = async () => {
    const res = await fetch('/api/shop?action=unpublish', { method: 'DELETE' })
    if (res.ok) { success('Shop unpublished'); fetchShop() }
    else error('Failed')
  }

  const handleDelete = async () => {
    const res = await fetch('/api/shop?action=delete', { method: 'DELETE' })
    if (res.ok) { success('Shop deleted'); setDeleteTarget(null); fetchShop() }
    else error('Failed')
  }

  if (loading) return <Loading size="medium" />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>🏪 My Shop</h1>
          <p className={styles.subtitle}>Manage your shop presence across all listings</p>
        </div>
        <div className={styles.headerActions}>
          {shop?.shopSlug && (
            <Link href={`/shop/${shop.shopSlug}`} className="btn-secondary">🌐 View Shop</Link>
          )}
          <button onClick={() => setEditing(!editing)} className="btn-primary">
            {editing ? '✕ Cancel' : '⚙️ Edit Shop'}
          </button>
        </div>
      </div>

      {!shop?.shopSlug && !editing && (
        <div className={styles.prompt}>
          <h3>You don't have a published shop yet</h3>
          <p>Create a shop to showcase all your products, services, and rentals in one place.</p>
          <button onClick={() => setEditing(true)} className="btn-primary">➕ Create Shop</button>
        </div>
      )}

      {editing ? (
        <div className={styles.formCard}>
          <h2>Shop Settings</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Shop Name</label>
              <input type="text" value={form.shopName} onChange={e => setForm({...form, shopName: e.target.value})} placeholder="Your shop name" />
            </div>
            <div className="form-group">
              <label>About Your Shop</label>
              <textarea value={form.shopAbout} onChange={e => setForm({...form, shopAbout: e.target.value})} rows={3} placeholder="Tell customers about your shop..." />
            </div>
            <div className="form-group">
              <label>Shop Image</label>
              <ImageUploader images={form.shopImages || []} onChange={(urls) => setForm({...form, shopImages: urls})} maxImages={1} />
            </div>
            <div className="form-group">
              <label>Shop URL Slug</label>
              <input type="text" value={form.shopSlug} onChange={e => setForm({...form, shopSlug: e.target.value})} placeholder="my-shop" />
              <small style={{color: 'var(--text-secondary)'}}>xistrymemz.com/shop/{form.shopSlug || 'your-slug'}</small>
            </div>
            <div className="form-group">
              <label>Contact Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Shop Settings'}
              </button>
            </div>
          </form>
          {shop?.shopSlug && (
            <div className={styles.dangerZone}>
              <h3>Danger Zone</h3>
              <p>These actions affect your entire shop and all its listings.</p>
              <div className={styles.dangerActions}>
                <button onClick={() => setDeleteTarget('unpublish')} className={styles.unpublishBtn}>Unpublish Shop</button>
                <button onClick={() => setDeleteTarget('delete')} className={styles.deleteBtn}>Delete Shop</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.statCards}>
            <Link href="/dashboard/marketplace" className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statValue}>{stats.products}</div>
              <div className={styles.statLabel}>Products</div>
            </Link>
            <Link href="/dashboard/services" className={styles.statCard}>
              <div className={styles.statIcon}>🔧</div>
              <div className={styles.statValue}>{stats.services}</div>
              <div className={styles.statLabel}>Services</div>
            </Link>
            <Link href="/dashboard/rentals" className={styles.statCard}>
              <div className={styles.statIcon}>🏠</div>
              <div className={styles.statValue}>{stats.rentals}</div>
              <div className={styles.statLabel}>Rentals</div>
            </Link>
            <Link href={`/shop/${shop?.shopSlug || ''}`} className={styles.statCard} style={!shop?.shopSlug ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
              <div className={styles.statIcon}>🏪</div>
              <div className={styles.statValue}>{shop?.shopSlug ? 'Live' : '—'}</div>
              <div className={styles.statLabel}>Shop Page</div>
            </Link>
          </div>

          {shop?.shopSlug && (
            <div className={styles.shopCard}>
              <div className={styles.shopPreview}>
                {shop.shopImage && (
                  <img src={shop.shopImage} alt="" className={styles.shopImage} />
                )}
                <div className={styles.shopInfo}>
                  <h2>{shop.shopName || 'Unnamed Shop'}</h2>
                  {shop.shopAbout && <p>{shop.shopAbout}</p>}
                  <div className={styles.shopMeta}>
                    <span>🔗 /shop/{shop.shopSlug}</span>
                    {shop.email && <span>📧 {shop.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget === 'unpublish'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleUnpublish}
        title="Unpublish Shop"
        message="Your shop will no longer appear in the directory. All products are preserved."
        confirmLabel="Unpublish"
        variant="warning"
      />
      <ConfirmDialog
        isOpen={deleteTarget === 'delete'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Shop"
        message="This permanently removes your shop name, description, and image. Your products will remain but will no longer be linked to a shop. This cannot be undone."
        confirmLabel="Delete Shop"
        variant="danger"
      />
    </div>
  )
}
