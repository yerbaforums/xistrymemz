'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import ImageUploader from '@/components/ImageUploader'
import Loading from '@/components/Loading'
import Breadcrumbs from '@/components/Breadcrumbs'
import Button from '@/components/ui/Button'
import { slugify } from '@/lib/utils'

interface PodcastData {
  podcastName: string
  podcastAbout: string
  podcastImage: string
  podcastCoverImage: string
  podcastSlug: string
  showPodcast: boolean
}

export default function PodcastSetupClient() {
  const { success, error } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(false)

  const [form, setForm] = useState<PodcastData>({
    podcastName: '', podcastAbout: '', podcastImage: '', podcastCoverImage: '', podcastSlug: '', showPodcast: true,
  })
  const [podcastImages, setPodcastImages] = useState<string[]>([])
  const [coverImages, setCoverImages] = useState<string[]>([])

  useEffect(() => { fetchPodcast() }, [])

  const fetchPodcast = async () => {
    try {
      const res = await fetch('/api/podcast')
      if (res.ok) {
        const data = await res.json()
        const p = data?.data || {}
        setForm({
          podcastName: p.podcastName || '',
          podcastAbout: p.podcastAbout || '',
          podcastImage: p.podcastImage || '',
          podcastCoverImage: p.podcastCoverImage || '',
          podcastSlug: p.podcastSlug || '',
          showPodcast: p.showPodcast ?? true,
        })
        if (p.podcastImage) setPodcastImages([p.podcastImage])
        if (p.podcastCoverImage) setCoverImages([p.podcastCoverImage])
        setExisting(!!p.podcastSlug)
      }
    } catch {
      error('Failed to load podcast settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.podcastName.trim()) {
      error('Podcast name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/podcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastName: form.podcastName,
          podcastAbout: form.podcastAbout,
          podcastImage: form.podcastImage || null,
          podcastCoverImage: form.podcastCoverImage || null,
          podcastSlug: form.podcastSlug || slugify(form.podcastName) || undefined,
          showPodcast: form.showPodcast,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success(existing ? 'Podcast updated!' : 'Podcast created! Your feed is ready.')
        if (data?.data?.podcastSlug && !existing) router.push(`/podcast/${data.data.podcastSlug}`)
        else router.refresh()
      } else {
        error(data?.error || 'Failed to save podcast')
      }
    } catch {
      error('Failed to save podcast')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Podcast', href: '/podcast/setup' }, { label: 'Setup' }]} />
      <h1>🎙️ Podcast Setup</h1>
      <p className={styles.sub}>Publish audio episodes under your own feed URL and broadcast live to members. Your show gets a standard RSS feed you can submit to Apple Podcasts, Spotify, and more.</p>

      <form onSubmit={handleSave} className={styles.form}>
        <label className={styles.field}>
          <span>Podcast name *</span>
          <input
            type="text"
            value={form.podcastName}
            onChange={e => {
              setForm({ ...form, podcastName: e.target.value, podcastSlug: form.podcastSlug || slugify(e.target.value) })
            }}
            placeholder="e.g. The Weekly Signal"
            maxLength={80}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Description</span>
          <textarea
            value={form.podcastAbout}
            onChange={e => setForm({ ...form, podcastAbout: e.target.value })}
            placeholder="What is your show about? Who is it for?"
            rows={4}
            maxLength={600}
          />
          <small>{form.podcastAbout.length}/600</small>
        </label>

        <label className={styles.field}>
          <span>Custom URL slug (optional)</span>
          <input
            type="text"
            value={form.podcastSlug}
            onChange={e => setForm({ ...form, podcastSlug: slugify(e.target.value) })}
            placeholder="my-podcast"
          />
          <small>{form.podcastSlug ? `Your podcast will live at /podcast/${form.podcastSlug}` : 'Auto-generated from the name'}</small>
        </label>

        <div className={styles.fieldsRow}>
          <div className={styles.field}>
            <span>Cover image</span>
            <ImageUploader images={coverImages} onChange={urls => { setCoverImages(urls); setForm({ ...form, podcastCoverImage: urls[0] || '' }) }} maxImages={1} />
            <small>Square artwork, used for your RSS feed artwork.</small>
          </div>
          <div className={styles.field}>
            <span>Avatar</span>
            <ImageUploader images={podcastImages} onChange={urls => { setPodcastImages(urls); setForm({ ...form, podcastImage: urls[0] || '' }) }} maxImages={1} />
          </div>
        </div>

        <label className={styles.switchRow}>
          <input
            type="checkbox"
            checked={form.showPodcast}
            onChange={e => setForm({ ...form, showPodcast: e.target.checked })}
          />
          <span>Visible on the site &amp; in the podcast directory</span>
        </label>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create podcast'}
          </Button>
          {existing && (
            <Link href="/dashboard/podcast" className={styles.manageLink}>Go to dashboard →</Link>
          )}
        </div>
      </form>
    </div>
  )
}