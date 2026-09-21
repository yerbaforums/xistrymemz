'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { EmptyState } from '@/components/EmptyState'
import type { PhotoPost } from './page'

function firstImage(p: PhotoPost): string | null {
  try {
    const arr = JSON.parse(p.images || 'null')
    if (Array.isArray(arr) && typeof arr[0] === 'string') return arr[0]
  } catch {}
  return typeof p.imageUrl === 'string' ? p.imageUrl : null
}

function imageCount(p: PhotoPost): number {
  try {
    const arr = JSON.parse(p.images || 'null')
    if (Array.isArray(arr)) return arr.length
  } catch {}
  return p.imageUrl ? 1 : 0
}

export function PhotosClient({ initialPosts }: { initialPosts: PhotoPost[] }) {
  const [posts] = useState<PhotoPost[]>(initialPosts)

  const photos = useMemo(
    () =>
      posts
        .map((p) => ({ post: p, url: firstImage(p), count: imageCount(p) }))
        .filter((x) => !!x.url),
    [posts],
  )

  if (photos.length === 0) {
    return (
      <EmptyState
        icon="📸"
        title="No photos yet"
        description="Be the first to share a photo with the community."
        action={{ label: 'Create a post', href: '/dashboard/feed' }}
      />
    )
  }

  return (
    <div className={styles.grid}>
      {photos.map(({ post, url, count }) => (
        <Link key={post.id} href={`/posts/${post.id}`} className={styles.tile}>
          <img src={url!} alt="" loading="lazy" />
          <span className={styles.overlay}>
            <span className={styles.author}>
              {post.user.image ? (
                <img src={post.user.image} alt="" className={styles.avatar} />
              ) : (
                <span className={styles.avatarFallback}>{(post.user.name || 'U')[0]}</span>
              )}
              <span className={styles.name}>{post.user.name || 'Unknown'}</span>
            </span>
            <span className={styles.meta}>
              ♥ {post.likes ?? 0}
              {count > 1 && ` · +${count - 1}`}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}
