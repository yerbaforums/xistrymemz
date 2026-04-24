'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from './page.module.css'

interface ShopData {
  shopName: string
  shopAbout: string | null
  shopImage: string | null
  user: { name: string | null; id: string }
}

interface Product {
  id: string
  title: string
  price: number | null
  imageUrl: string | null
  type: string
}

export default function ShopPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [shop, setShop] = useState<ShopData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return

    fetch(`/api/shop/public/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Shop not found')
        return res.json()
      })
      .then(data => {
        setShop(data)
        return fetch(`/api/products?userId=${data.user.id}`)
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch products')
        return res.json()
      })
      .then(data => {
        setProducts(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Shop not found')
        setLoading(false)
      })
  }, [slug])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (error) return <div className={styles.error}>{error}</div>
  if (!shop) return <div className={styles.error}>Shop not found</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {shop.shopImage && (
          <img src={shop.shopImage} alt={shop.shopName} className={styles.shopImage} />
        )}
        <div className={styles.shopInfo}>
          <h1>{shop.shopName}</h1>
          {shop.shopAbout && <p className={styles.about}>{shop.shopAbout}</p>}
          <p className={styles.owner}>
            by <Link href={`/profile/${shop.user.id}`} className={styles.ownerLink}>{shop.user.name || 'Unknown'}</Link>
          </p>
        </div>
      </div>

      <h2>Products</h2>
      {products.length === 0 ? (
        <p className={styles.empty}>No products listed yet</p>
      ) : (
        <div className={styles.productGrid}>
          {products.map(product => (
            <Link key={product.id} href={`/products/${product.id}`} className={styles.productCard}>
              {product.imageUrl && (
                <div className={styles.productImage}>
                  <img src={product.imageUrl} alt={product.title} />
                </div>
              )}
              <div className={styles.productInfo}>
                <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                <h3>{product.title}</h3>
                {product.price && <p className={styles.price}>${product.price}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
