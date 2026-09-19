'use client'

import { useState, useEffect, Suspense } from 'react'
import styles from './page.module.css'
import { PodcastsClient } from './PodcastsClient'
import { SkeletonCard } from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Podcast {
  id: string
  podcastName: string | null
  podcastAbout: string | null
  podcastImage: string | null
  podcastCoverImage: string | null
  podcastSlug: string
  name: string | null
  username: string | null
  image: string | null
  location: string | null
  latestEpisode: { title: string; publishedAt: string; durationSec: number } | null
  isLive: boolean
  liveInviteCode: string | null
  _count?: { podcastEpisodes: number }
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPodcasts()
  }, [])

  async function fetchPodcasts() {
    try {
      const res = await fetch('/api/podcasts')
      if (res.ok) {
        const data = await res.json()
        setPodcasts(data?.data?.podcasts || data?.podcasts || [])
      }
    } catch (error) {
      console.error('Failed to fetch podcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Podcasts' }]} />
        <h1>Podcasts</h1>
        <p>Audio shows from community members — listen, subscribe via RSS, and join live broadcasts</p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <Suspense fallback={<SkeletonCard />}>
          <PodcastsClient initialPodcasts={podcasts} />
        </Suspense>
      )}
    </div>
  )
}
