'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Shop {
  id: string
  shopName: string
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string
  name: string | null
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShops()
  }, [])

  async function fetchShops() {
    try {
      const res = await fetch('/api/shops')
      if (res.ok) {
        const data = await res.json()
        setShops(data.shops || [])
      }
    } catch (error) {
      console.error('Failed to fetch shops:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Shops</h1>
        <p>Discover shops created by community members</p>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading shops...</div>
      ) : shops.length === 0 ? (
        <div className={styles.empty}>
          <p>No shops yet. Be the first to create one!</p>
          <Link href="/shop/setup" className={styles.createBtn}>
            Create Shop
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {shops.map(shop => (
            <Link key={shop.id} href={`/shop/${shop.shopSlug}`} className={styles.shopCard}>
              {shop.shopImage && (
                <div className={styles.shopImage}>
                  <img src={shop.shopImage} alt={shop.shopName} />
                </div>
              )}
              <div className={styles.shopInfo}>
                <h3>{shop.shopName}</h3>
                {shop.shopAbout && <p>{shop.shopAbout}</p>}
                <span className={styles.shopOwner}>by {shop.name || 'Unknown'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
