'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import styles from './listings.module.css'
import Loading from '@/components/Loading'

interface ShopInfo {
  shopName: string | null
  shopSlug: string | null
  shopImage: string | null
  shopAbout: string | null
}

interface ProductRow {
  id: string
  title: string
  type: string
  price?: any
  published: boolean
  acceptsAppointments: boolean
  acceptsDonations: boolean
  imageUrl?: string | null
  createdAt: string
}

interface ServiceRow {
  id: string
  title: string
  price?: any
  isActive: boolean
  acceptsAppointments: boolean
  acceptsDonations: boolean
  imageUrl?: string | null
  createdAt: string
}

export default function ShopListingsPage() {
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/shop').then(r => r.ok ? r.json() : null),
      fetch('/api/products/user').then(r => r.ok ? r.json() : null),
      fetch('/api/services/user').then(r => r.ok ? r.json() : null),
    ])
      .then(([shopData, productsData, servicesData]) => {
        setShop(shopData)
        const items = Array.isArray(productsData) ? productsData : productsData?.items || productsData?.products || []
        setProducts(items.map((p: any) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          price: p.price,
          published: p.published ?? true,
          acceptsAppointments: p.acceptsAppointments ?? false,
          acceptsDonations: p.acceptsDonations ?? false,
          imageUrl: p.imageUrl || p.images?.[0] || null,
          createdAt: p.createdAt,
        })))
        const svcs = servicesData?.data?.services || servicesData?.services || []
        setServices(svcs.map((s: any) => ({
          id: s.id,
          title: s.title,
          price: s.price,
          isActive: s.isActive ?? true,
          acceptsAppointments: s.acceptsAppointments ?? false,
          acceptsDonations: s.acceptsDonations ?? false,
          imageUrl: s.imageUrl,
          createdAt: s.createdAt,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading size="medium" />

  const rentals = products.filter(p => p.type === 'RENTAL')
  const goods = products.filter(p => p.type !== 'RENTAL')

  const ItemCard = ({ item, isService }: { item: ProductRow | ServiceRow, isService?: boolean }) => {
    const pid = item.id
    const published = isService ? (item as ServiceRow).isActive : (item as ProductRow).published
    const url = isService ? `/services/${pid}` : `/products/${pid}`
    const price = item.price ? `$${Number(item.price).toLocaleString()}` : null
    return (
      <div className={styles.card}>
        <div className={styles.cardMain}>
          <div className={styles.cardThumb}>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" />
            ) : (
              <span className={styles.cardIcon}>{isService ? '🔧' : (item as ProductRow).type === 'RENTAL' ? '🏠' : '📦'}</span>
            )}
          </div>
          <div className={styles.cardInfo}>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <div className={styles.cardMeta}>
              <span className={`${styles.badge} ${published ? styles.badgeLive : styles.badgeDraft}`}>
                {published ? 'Live' : 'Draft'}
              </span>
              {item.acceptsAppointments && <span className={styles.badge}>📅 Bookable</span>}
              {item.acceptsDonations && <span className={styles.badge}>💚 Donations</span>}
              {price && <span className={styles.price}>{price}</span>}
            </div>
          </div>
        </div>
        <div className={styles.cardActions}>
          <Link href={url} className={styles.actionLink} target="_blank">View</Link>
          <Link href={url} className={styles.actionLink}>Edit</Link>
          <Link href={`/dashboard/appointments?item=${pid}`} className={styles.actionLink}>Bookings</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>🏷️ My Listings</h1>
          <p className={styles.subtitle}>
            {shop?.shopName
              ? `Everything in ${shop.shopName}, in one place.`
              : 'Manage everything you have listed on Xistry.'}
          </p>
        </div>
        <div className={styles.headerActions}>
          {shop?.shopSlug && (
            <Link href={`/shop/${shop.shopSlug}`} className={styles.btnGhost}>🌐 View Shop</Link>
          )}
          <Link href="/dashboard/shop" className={styles.btnGhost}>⚙️ Shop Settings</Link>
        </div>
      </div>

      <div className={styles.createRow}>
        <Link href="/products/new" className={styles.btnPrimary}>➕ New Product</Link>
        <Link href="/products/new?type=rental" className={styles.btnPrimary}>🏠 New Rental</Link>
        <Link href="/dashboard/services" className={styles.btnPrimary}>🔧 New Service</Link>
      </div>

      {products.length === 0 && services.length === 0 ? (
        <div className={styles.prompt}>
          <h3>No listings yet</h3>
          <p>List a product, rental, or service to start selling, booking, and taking orders.</p>
          <div className={styles.createRow} style={{ justifyContent: 'center' }}>
            <Link href="/products/new" className={styles.btnPrimary}>List a Product</Link>
            <Link href="/products/new?type=rental" className={styles.btnPrimary}>List a Rental</Link>
            <Link href="/dashboard/services" className={styles.btnPrimary}>Offer a Service</Link>
          </div>
        </div>
      ) : (
        <div className={styles.sections}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>🛍️ Products</h2>
              <Link href="/dashboard/marketplace" className={styles.sectionLink}>Manage →</Link>
            </div>
            {goods.length === 0 ? (
              <div className={styles.emptyRow}>
                <p>No products yet.</p>
                <Link href="/products/new" className={styles.sectionLink}>+ Add</Link>
              </div>
            ) : (
              <div className={styles.list}>{goods.map(p => <ItemCard key={p.id} item={p} />)}</div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>🏠 Rentals</h2>
              <Link href="/dashboard/rentals" className={styles.sectionLink}>Manage →</Link>
            </div>
            {rentals.length === 0 ? (
              <div className={styles.emptyRow}>
                <p>No rentals yet.</p>
                <Link href="/products/new?type=rental" className={styles.sectionLink}>+ Add</Link>
              </div>
            ) : (
              <div className={styles.list}>{rentals.map(p => <ItemCard key={p.id} item={p} />)}</div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>🔧 Services</h2>
              <Link href="/dashboard/services" className={styles.sectionLink}>Manage →</Link>
            </div>
            {services.length === 0 ? (
              <div className={styles.emptyRow}>
                <p>No services yet.</p>
                <Link href="/dashboard/services" className={styles.sectionLink}>+ Add</Link>
              </div>
            ) : (
              <div className={styles.list}>{services.map(s => <ItemCard key={s.id} item={s} isService />)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}