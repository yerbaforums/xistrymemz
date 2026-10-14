'use client'

import { useMemo, useCallback, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import AlphabeticalIndex, { type IndexItem } from '@/components/AlphabeticalIndex'
import IpfsImage from '@/components/IpfsImage'
import { EmptyState } from '@/components/EmptyState'
import { formatDuration } from '@/lib/media'

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

interface PodcastsClientProps {
  initialPodcasts: Podcast[]
}

export function PodcastsClient({ initialPodcasts }: PodcastsClientProps) {
  const [podcasts] = useState<Podcast[]>(initialPodcasts)
  const [search, setSearch] = useState('')

  const filteredPodcasts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return podcasts
    return podcasts.filter(p =>
      (p.podcastName || p.name || '').toLowerCase().includes(q) ||
      (p.podcastAbout || '').toLowerCase().includes(q) ||
      (p.username || p.name || '').toLowerCase().includes(q)
    )
  }, [podcasts, search])

  const indexItems: IndexItem[] = useMemo(
    () =>
      filteredPodcasts.map((p) => ({
        id: p.id,
        label: p.podcastName || p.name || 'Untitled',
        sortKey: p.podcastName || p.name || 'Untitled',
      })),
    [filteredPodcasts]
  )

  const renderPodcast = useCallback(
    (item: IndexItem) => {
      const p = podcasts.find((x) => x.id === item.id)!
      return (
        <Link key={p.id} href={`/podcast/${p.podcastSlug}`} className={styles.podcastCard}>
          {p.podcastCoverImage ? (
            <div className={styles.cardCover}>
              <IpfsImage src={p.podcastCoverImage} alt="" thumbWidth={512} />
            </div>
          ) : (
            <div className={`${styles.cardCover} ${styles.coverGradient}`}>
              <span className={styles.coverInitial}>{(p.podcastName || p.name || 'P')[0].toUpperCase()}</span>
            </div>
          )}
          <div className={styles.cardBody}>
            <div className={styles.cardTop}>
              {p.podcastImage ? (
                <IpfsImage src={p.podcastImage} alt="" className={styles.cardAvatar} thumbWidth={256} />
              ) : (
                <span className={styles.cardAvatarPlaceholder}>{(p.podcastName || p.name || 'P')[0].toUpperCase()}</span>
              )}
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>{p.podcastName || p.name || 'Untitled'}</h3>
                {p.location && <span className={styles.cardLocation}>📍 {p.location}</span>}
              </div>
              {p.isLive && <span className={styles.liveBadge}>🔴 LIVE</span>}
            </div>
            <p className={styles.cardDesc}>{p.podcastAbout || (p._count?.podcastEpisodes ? `${p._count.podcastEpisodes} episodes` : 'A podcast on XistrYmemZ')}</p>
            {p.latestEpisode && (
              <div className={styles.latestEpisode}>
                <span className={styles.latestLabel}>Latest</span>
                <span className={styles.latestTitle}>
                  {p.latestEpisode.title}
                  {p.latestEpisode.durationSec > 0 && ` · ${formatDuration(p.latestEpisode.durationSec)}`}
                </span>
              </div>
            )}
            <div className={styles.cardFooter}>
              <span className={styles.episodeCount}>{p._count?.podcastEpisodes ?? 0} episodes</span>
              <span className={styles.listenNow}>Listen →</span>
            </div>
          </div>
        </Link>
      )
    },
    [podcasts]
  )

  if (podcasts.length === 0) {
    return (
      <EmptyState
        icon="🎙️"
        title="No podcasts yet"
        description="Be the first to start a podcast — publish episodes under your own feed and broadcast live."
        action={{ label: 'Start a podcast', href: '/podcast/setup' }}
      />
    )
  }

  return (
    <div>
      <div className={styles.searchBar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search podcasts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search podcasts"
        />
      </div>
      {indexItems.length === 0 ? (
        <EmptyState
          icon="🎙️"
          title="No podcasts match"
          description={search ? `Nothing found for "${search}".` : 'No podcasts yet.'}
          action={search ? { label: 'Clear search', onClick: () => setSearch('') } : undefined}
        />
      ) : (
        <AlphabeticalIndex
          items={indexItems}
          renderCard={renderPodcast}
          sidebarTitle="Podcasts"
        />
      )}
    </div>
  )
}
