'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { ShopsClient } from './ShopsClient'
import { SkeletonCard } from '@/components/Skeleton'

interface Shop {
  id: string
  shopName: string
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string
  shopCategory: string | null
  name: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  _count?: {
    products: number
  }
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
        <SkeletonCard />
      ) : (
        <ShopsClient initialShops={shops} />
      )}
    </div>
  )
}
