'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import EntityActions from '@/components/EntityActions'
import styles from './page.module.css'

interface ContentData {
  id: string
  title: string
  content: string
  contentType: string
  images: string | null
  videoUrl: string | null
  price: number | null
  isPaid: boolean
  pinned: boolean
  createdAt: string
  author: { id: string; name: string | null; image: string | null }
  user: { id: string; schoolName: string | null; schoolSlug: string | null; image: string | null }
  hashtags: { hashtag: { id: string; tag: string } }[]
  _count: { likes: number }
}

const CONTENT_TYPE_ICONS: Record<string, string> = {
  article: '📄', lesson: '📖', note: '📝', guide: '🗺️', course: '🎓', resource: '📦'
}

export default function SchoolContentDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const id = params.id as string
  const [content, setContent] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/school/${slug}/content/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setContent(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, id])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!content) return <div className={styles.error}>Content not found</div>

  const images: string[] = content.images ? JSON.parse(content.images) : []

  return (
    <div className={styles.page}>
      <nav className="breadcrumbs">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/schools" className="breadcrumb-link">Schools</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href={`/school/${slug}`} className="breadcrumb-link">{content.user.schoolName || 'School'}</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">{content.title}</span>
      </nav>

      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={styles.typeBadge}>{CONTENT_TYPE_ICONS[content.contentType] || '📄'} {content.contentType}</span>
          <span className={`badge ${content.isPaid ? 'badge-active' : 'badge-draft'}`}>
            {content.isPaid ? `$${content.price || 0}` : 'Free'}
          </span>
        </div>
        <h1 className={styles.title}>{content.title}</h1>
        <div className={styles.meta}>
          <span>by {content.author.name || 'Unknown'}</span>
          <span>{new Date(content.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className={styles.body}>
        {content.content.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {images.length > 0 && (
        <div className={styles.imageGrid}>
          {images.map((url, i) => (
            <div key={i} className={styles.imageWrap}>
              <img src={url} alt="" />
            </div>
          ))}
        </div>
      )}

      {content.videoUrl && (
        <div className={styles.videoWrap}>
          <video src={content.videoUrl} controls className={styles.video} />
        </div>
      )}

      {content.hashtags && content.hashtags.length > 0 && (
        <div className={styles.hashtagRow}>
          {content.hashtags.map((h) => (
            <Link key={h.hashtag.id} href={`/hashtag/${h.hashtag.tag}`} className={styles.hashtagPill}>
              #{h.hashtag.tag}
            </Link>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <EntityActions entityType="SCHOOLCONTENT" entityId={content.id} title={content.title} authorId={content.author.id} variant="bar" />
      </div>
    </div>
  )
}
