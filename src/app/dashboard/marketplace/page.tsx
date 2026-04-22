'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
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
  createdAt: string
}

export default function DashboardMarketplace() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products/user')
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Marketplace' }
      ]} />
      
      <div className={styles.header}>
        <div>
          <h1>My Marketplace</h1>
          <p className={styles.welcome}>Manage your products and services</p>
        </div>
        <Link href="/products" className="btn-secondary">Browse Marketplace</Link>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven&apos;t listed any products or services yet.</p>
          <Link href="/products" className="btn-primary">Browse & List</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {products.map(product => (
            <Link key={product.id} href={`/products/${product.id}`} className={styles.item}>
              <div className={styles.itemMain}>
                <h3>{product.title}</h3>
                <p>{product.description || 'No description'}</p>
                <div className={styles.itemMeta}>
                  <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                  {product.category && <span className="badge badge-category">{product.category}</span>}
                  {product.condition && <span className="badge badge-condition">{product.condition}</span>}
                </div>
              </div>
              <div className={styles.itemSide}>
                {product.price && <p className={styles.price}>${product.price}</p>}
                <span className={styles.location}>
                  {product.isGlobal ? '🌍 Global' : `📍 ${product.location || 'Local'}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
