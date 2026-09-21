'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ShareBar from '@/components/ShareBar'
import Loading from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import Button from '@/components/ui/Button'
import { getUserProfileUrl } from '@/lib/utils'
import { formatDuration } from '@/lib/media'
import styles from './page.module.css'

interface Episode {
  id: string
  title: string
  description: string
  audioUrl: string
  durationSec: number
  episodeNumber: number | null
  isExplicit: boolean
  publishedAt: string
}

interface PodcastData {
  id: string
  name: string | null
  username: string | null
  image: string | null
  location: string | null
  podcastName: string | null
  podcastAbout: string | null
  podcastImage: string | null
  podcastCoverImage: string | null
  podcastSlug: string | null
  episodeCount: number
}

interface ApiData {
  podcast: PodcastData
  episodes: Episode[]
  liveRoom: { id: string; inviteCode: string; host: { name: string | null }; listeners: number } | null
  feedUrl: string
}

export default function PodcastDetailClient({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('')
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    let active = true
    params.then(({ slug: s }) => {
      setSlug(s)
      fetch(`/api/podcast/${s}`)
        .then(res => res.ok ? res.json() : null)
        .then(json => { if (active) setData(json?.data || null) })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false }
  }, [params])

  if (loading) return <Loading />

  if (!data || !data.podcast?.podcastSlug) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon="🎙️"
          title="Podcast not found"
          description="This show may have been unpublished or the link is wrong."
        />
      </div>
    )
  }

  const p = data.podcast
  const isOwner = session?.user?.id === p.id
  const cover = p.podcastCoverImage || p.podcastImage

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Podcasts', href: '/podcasts' }, { label: p.podcastName || slug }]} />
        {cover && (
          <div className={styles.coverWrap}>
            <Image src={cover} alt="" fill priority sizes="(max-width: 768px) 100vw, 1200px" style={{ objectFit: 'cover' }} />
            <div className={styles.coverShade} />
          </div>
        )}
        <div className={styles.headerInner}>
          <div className={styles.avatarWrap}>
            {p.podcastImage ? (
              <Image src={p.podcastImage} alt="" width={88} height={88} className={styles.avatar} />
            ) : (
              <span className={styles.avatarPlaceholder}>{(p.podcastName || '🎙')[0]}</span>
            )}
          </div>
          <div className={styles.headerText}>
            <div className={styles.titleRow}>
              {data.liveRoom && <span className={styles.liveBadge}>🔴 LIVE</span>}
              <h1>{p.podcastName || p.name || slug}</h1>
            </div>
            <p className={styles.about}>{p.podcastAbout}</p>
            <div className={styles.meta}>
              <span>{data.episodes.length} episode{data.episodes.length === 1 ? '' : 's'}</span>
              {p.name && (
                <>
                  <span className={styles.dot}>·</span>
                  <Link href={getUserProfileUrl({ username: p.username, id: p.id })} className={styles.authorLink}>
                    by {p.name}
                  </Link>
                </>
              )}
              {p.location && <span className={styles.dot}>·</span>}
              {p.location && <span>{p.location}</span>}
            </div>
            <div className={styles.actions}>
              <a href={data.feedUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm" icon="📡">RSS feed</Button>
              </a>
              {data.liveRoom ? (
                <Button variant="primary" size="sm" icon="🔴" onClick={() => router.push(`/dashboard/video?invite=${data.liveRoom!.inviteCode}`)}>
                  Join live · {data.liveRoom.listeners} listening
                </Button>
              ) : isOwner ? (
                <Link href="/dashboard/podcast"><Button variant="primary" size="sm" icon="🔴">Go live</Button></Link>
              ) : null}
              {isOwner && (
                <Link href="/podcast/setup"><Button variant="ghost" size="sm">Edit</Button></Link>
              )}
            </div>
            <ShareBar entityType="PODCAST" url={typeof window !== 'undefined' ? window.location.href : ''} title={p.podcastName || ''} />
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {data.episodes.length === 0 ? (
          <EmptyState icon="🎧" title="No episodes yet" description="The host hasn't published any episodes. Subscribe to the feed to get notified." />
        ) : (
          <div className={styles.episodeList}>
            {data.episodes.map((ep, i) => (
              <div key={ep.id} className={styles.episodeCard}>
                <div className={styles.episodeNum}>{String(ep.episodeNumber ?? (data.episodes.length - i)).padStart(2, '0')}</div>
                <div className={styles.episodeBody}>
                  <div className={styles.episodeHead}>
                    <div>
                      <h3>{ep.title}</h3>
                      <span className={styles.episodeMeta}>
                        {ep.durationSec > 0 ? formatDuration(ep.durationSec) : ''}
                        {ep.durationSec > 0 && ' · '}
                        {new Date(ep.publishedAt).toLocaleDateString()}
                        {ep.isExplicit && ' · Explicit'}
                      </span>
                    </div>
                    <span className={styles.episodePlay}>▶</span>
                  </div>
                  {ep.description && <p className={styles.episodeDesc}>{ep.description}</p>}
                  <audio controls preload="none" src={ep.audioUrl} className={styles.player} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}