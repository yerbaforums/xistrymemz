'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './podcast.module.css'
import { useToast } from '@/context/ToastContext'
import Loading from '@/components/Loading'
import Button from '@/components/ui/Button'
import AudioUploader from '@/components/AudioUploader'
import VideoChatModal from '@/components/VideoChatModal'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDuration } from '@/lib/media'

interface PodcastInfo {
  podcastName: string | null
  podcastAbout: string | null
  podcastSlug: string | null
  showPodcast: boolean
}

interface Episode {
  id: string
  title: string
  description: string
  audioUrl: string
  durationSec: number
  episodeNumber: number | null
  isExplicit: boolean
  publishedAt: string
  createdAt: string
}

interface LiveRoom {
  id: string
  name: string | null
  inviteCode: string
  listeners: number
}

export default function PodcastDashboardPage() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [podcast, setPodcast] = useState<PodcastInfo | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [live, setLive] = useState<LiveRoom | null>(null)
  const [slug, setSlug] = useState('')

  const [showLive, setShowLive] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Episode form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [durationSec, setDurationSec] = useState(0)
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [isExplicit, setIsExplicit] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    let activeSlug = slug
    try {
      const res = await fetch('/api/podcast')
      if (res.ok) {
        const data = await res.json()
        const p = data?.data || {}
        setPodcast({
          podcastName: p.podcastName || null,
          podcastAbout: p.podcastAbout || null,
          podcastSlug: p.podcastSlug || null,
          showPodcast: p.showPodcast ?? true,
        })
        activeSlug = p.podcastSlug || ''
        setSlug(activeSlug)
      }
    } catch {
      /* episodes load is best-effort */
    }
    try {
      if (!activeSlug) return
      const res = await fetch(`/api/podcast/${activeSlug}`)
      if (res.ok) {
        const data = await res.json()
        setEpisodes(data?.data?.episodes || [])
        setLive(data?.data?.liveRoom || null)
      }
    } catch {
      /* episodes load is best-effort */
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return error('Title is required')
    if (!audioUrl) return error('Upload an audio file first')
    if (!slug) return error('Set up your podcast first')

    setSaving(true)
    try {
      const res = await fetch(`/api/podcast/${slug}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          audioUrl,
          durationSec,
          episodeNumber: episodeNumber ? Number(episodeNumber) : null,
          isExplicit,
          published: true,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success('Episode published!')
        setTitle(''); setDescription(''); setAudioUrl(null); setEpisodeNumber(''); setIsExplicit(false); setDurationSec(0)
        fetchAll()
      } else {
        error(data?.error || 'Failed to publish episode')
      }
    } catch {
      error('Failed to publish episode')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/podcast/episodes/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      success('Episode deleted')
      fetchAll()
    } else {
      error('Failed to delete episode')
    }
    setDeleteId(null)
  }

  const goLive = async () => {
    if (!slug) return
    setShowLive(true)
  }

  const copyInvite = async () => {
    if (!live?.inviteCode) return
    await navigator.clipboard.writeText(`${window.location.origin}/dashboard/video?invite=${live.inviteCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <Loading />

  if (!podcast?.podcastSlug) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>🎙️ Podcast Studio</h1>
          <p>Publish audio episodes and broadcast live to members.</p>
        </div>
        <EmptyState
          icon="🎙️"
          title="You haven't started a podcast"
          description="Create your show once and you'll get a personal feed URL, episode publishing, and live audio broadcasts."
          action={{ label: 'Start a podcast', onClick: () => { window.location.href = '/podcast/setup' } }}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>🎙️ Podcast Studio</h1>
        <p>{podcast.podcastName} — <Link href={`/podcast/${slug}`} className={styles.link}>view page</Link> · <Link href={`/podcast/${slug}/feed.xml`} className={styles.link}>RSS feed</Link></p>
      </div>

      {/* Live broadcast */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>🔴 Live broadcast</h2>
          {live && <span className={styles.liveBadge}>LIVE · {live.listeners} listener{live.listeners === 1 ? '' : 's'}</span>}
        </div>
        {live ? (
          <div className={styles.liveRow}>
            <span>&ldquo;{live.name || slug}&rdquo; is live <strong>{live.listeners}</strong> listener{live.listeners === 1 ? '' : 's'}</span>
            <div className={styles.liveActions}>
              <Button variant="secondary" size="sm" onClick={() => setShowLive(true)}>Join studio</Button>
              <Button variant="ghost" size="sm" onClick={copyInvite}>{copied ? '✓ Copied' : 'Copy invite link'}</Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" onClick={goLive}>🔴 Go live</Button>
        )}
        {!live && <p className={styles.hint}>Go live to broadcast an audio-only room for your listeners. Members join from your podcast page by link.</p>}
      </section>

      {/* New episode */}
      <section id="new-episode" className={styles.section}>
        <h2>📤 New episode</h2>
        <form onSubmit={handlePublish} className={styles.episodeForm}>
          <div className={styles.formRow}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Episode title *" maxLength={120} />
            <input type="number" value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)} placeholder="Episode # (optional)" style={{ maxWidth: 130 }} />
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Show notes / description" rows={4} maxLength={2000} />
          <AudioUploader value={audioUrl} onChange={u => { setAudioUrl(u); if (!u) setDurationSec(0) }} onDuration={setDurationSec} />
          <div className={styles.formBottom}>
            <label className={styles.check}><input type="checkbox" checked={isExplicit} onChange={e => setIsExplicit(e.target.checked)} /> Explicit content</label>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Publishing…' : 'Publish episode'}</Button>
          </div>
        </form>
      </section>

      {/* Episodes */}
      <section className={styles.section}>
        <h2>📚 Episodes ({episodes.length})</h2>
        {episodes.length === 0 ? (
          <EmptyState
            icon="🎧"
            title="No episodes yet"
            description="Publish your first episode to build your show."
            action={{ label: '📤 Write your first episode', onClick: () => document.getElementById('new-episode')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
          />
        ) : (
          <div className={styles.episodeList}>
            {episodes.map((ep, i) => (
              <div key={ep.id} className={styles.episodeCard}>
                <div className={styles.episodeMain}>
                  <div className={styles.episodeNum}>{String(ep.episodeNumber ?? (episodes.length - i)).padStart(2, '0')}</div>
                  <div className={styles.episodeInfo}>
                    <strong>{ep.title}</strong>
                    <span className={styles.episodeMeta}>
                      {ep.durationSec > 0 ? formatDuration(ep.durationSec) : ''}
                      {ep.durationSec > 0 && ' · '}
                      {new Date(ep.publishedAt).toLocaleDateString()}
                      {ep.isExplicit && ' · E'}
                    </span>
                    <audio controls src={ep.audioUrl} preload="metadata" style={{ width: '100%', height: 38, marginTop: 4 }} />
                  </div>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setDeleteId(ep.id)}
                  title="Delete episode"
                >🗑️</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showLive && (
        <VideoChatModal
          mode="inline"
          audioOnly
          roomMeta={{ name: `Live: ${podcast.podcastName || slug}`, podcastSlug: slug }}
          onClose={() => { setShowLive(false); fetchAll() }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete episode"
        message="This permanently removes the episode from your feed."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}