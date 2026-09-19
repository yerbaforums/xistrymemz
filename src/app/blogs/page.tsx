'use client'

import { useState, useEffect, Suspense } from 'react'
import styles from './page.module.css'
import { BlogsClient } from './BlogsClient'
import { SkeletonCard } from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Blog {
  id: string
  blogName: string | null
  blogAbout: string | null
  blogImage: string | null
  blogCoverImage: string | null
  blogSlug: string
  blogTagline: string | null
  name: string | null
  username: string | null
  image: string | null
  location: string | null
  latestPost: { title: string; excerpt: string | null; publishedAt: string | null } | null
  _count?: { blogPosts: number }
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBlogs()
  }, [])

  async function fetchBlogs() {
    try {
      const res = await fetch('/api/blogs')
      if (res.ok) {
        const data = await res.json()
        setBlogs(data?.data?.blogs || data?.blogs || [])
      }
    } catch (error) {
      console.error('Failed to fetch blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blogs' }]} />
        <h1>Blogs</h1>
        <p>Long-form writing from community members — subscribe and support your favorite authors</p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <Suspense fallback={<SkeletonCard />}>
          <BlogsClient initialBlogs={blogs} />
        </Suspense>
      )}
    </div>
  )
}