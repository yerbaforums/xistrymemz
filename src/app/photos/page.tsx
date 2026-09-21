'use client'

import { useState, useEffect, Suspense } from 'react'
import styles from './page.module.css'
import { PhotosClient } from './PhotosClient'
import { SkeletonCard } from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

export interface PhotoPost {
  id: string
  images: string | null
  imageUrl: string | null
  content: string | null
  createdAt: string
  likes?: number
  user: { id: string; name: string | null; username?: string | null; image: string | null }
}

export default function PhotosPage() {
  const [posts, setPosts] = useState<PhotoPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPhotos()
  }, [])

  async function fetchPhotos() {
    try {
      const res = await fetch('/api/posts?limit=60')
      if (res.ok) {
        const data = await res.json()
        setPosts(Array.isArray(data?.posts) ? data.posts : [])
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Photos' }]} />
        <h1>Photos</h1>
        <p>Fresh shots from community members — tap any photo to open the post</p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <Suspense fallback={<SkeletonCard />}>
          <PhotosClient initialPosts={posts} />
        </Suspense>
      )}
    </div>
  )
}
