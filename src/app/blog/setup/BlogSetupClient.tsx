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
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface BlogData {
  blogName: string | null
  blogAbout: string | null
  blogImage: string | null
  blogCoverImage: string | null
  blogCoverStyle: string
  blogSlug: string | null
  blogTagline: string | null
  blogTiers: string | null
  showBlog: boolean
}

interface Tier {
  id: string
  name: string
  price: number
  currency: string
  description?: string
  expiresInDays?: number
}

export default function BlogSetupClient() {
  const { success, error } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<null | 'unpublish' | 'delete'>(null)

  const [form, setForm] = useState<BlogData>({
    blogName: '', blogAbout: '', blogImage: '', blogCoverImage: '',
    blogCoverStyle: 'cover', blogSlug: '', blogTagline: '', blogTiers: null, showBlog: true,
  })
  const [blogImages, setBlogImages] = useState<string[]>([])
  const [coverImages, setCoverImages] = useState<string[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])

  useEffect(() => { fetchBlog() }, [])

  const fetchBlog = async () => {
    try {
      const res = await fetch('/api/blog')
      if (res.ok) {
        const data = await res.json()
        const b = data?.data || {}
        setForm({
          blogName: b.blogName || '',
          blogAbout: b.blogAbout || '',
          blogImage: b.blogImage || '',
          blogCoverImage: b.blogCoverImage || '',
          blogCoverStyle: b.blogCoverStyle || 'cover',
          blogSlug: b.blogSlug || '',
          blogTagline: b.blogTagline || '',
          blogTiers: b.blogTiers || null,
          showBlog: b.showBlog !== undefined ? b.showBlog : true,
        })
        setBlogImages(b.blogImage ? [b.blogImage] : [])
        setCoverImages(b.blogCoverImage ? [b.blogCoverImage] : [])
        try { setTiers(b.blogTiers ? JSON.parse(b.blogTiers) : []) } catch { setTiers([]) }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!(form.blogName ?? '').trim()) {
      error('Blog name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          blogImage: blogImages[0] || null,
          blogCoverImage: coverImages[0] || null,
          blogTiers: tiers.length > 0 ? JSON.stringify(tiers) : null,
        }),
      })
      if (res.ok) {
        success(form.blogSlug ? 'Blog updated!' : 'Blog created!')
        await fetchBlog()
      } else {
        const err = await res.json().catch(() => null)
        error(err?.error || 'Failed to save blog')
      }
    } catch {
      error('Failed to save blog')
    } finally {
      setSaving(false)
    }
  }

  const updateTier = (index: number, patch: Partial<Tier>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const addTier = () => {
    setTiers((prev) => [...prev, {
      id: `tier-${Date.now()}`,
      name: `Tier ${prev.length + 1}`,
      price: 5,
      currency: 'USD',
      description: '',
      expiresInDays: 30,
    }])
  }

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUnpublish = async () => {
    const res = await fetch('/api/blog?action=unpublish', { method: 'DELETE' })
    if (res.ok) { success('Blog unpublished'); setDeleteTarget(null); fetchBlog() } else error('Failed')
  }

  const handleDelete = async () => {
    const res = await fetch('/api/blog?action=delete', { method: 'DELETE' })
    if (res.ok) {
      success('Blog deleted')
      setDeleteTarget(null)
      router.push('/blogs')
    } else error('Failed')
  }

  if (loading) return <Loading size="medium" />

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blogs', href: '/blogs' }, { label: form.blogSlug ? 'Blog Setup' : 'Start a Blog' }]} />

      <div className={styles.header}>
        <div>
          <h1>{form.blogSlug ? '✏️ My Blog' : '📝 Start a Blog'}</h1>
          <p className={styles.subtitle}>Write long-form posts with a Substack-style subscription model. Short posts stay on your profile.</p>
        </div>
        <div className={styles.headerActions}>
          {form.blogSlug && (
            <Link href={`/blog/${form.blogSlug}`} className="btn-secondary">🌐 View Blog</Link>
          )}
          {form.blogSlug && (
            <Link href="/dashboard/blog" className="btn-primary">✍️ Manage Posts</Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.formCard}>
        <h2>Blog Details</h2>

        <div className="form-group">
          <label>Blog Name</label>
          <input type="text" value={form.blogName ?? ''} onChange={(e) => setForm({ ...form, blogName: e.target.value })} placeholder="My Newsletter" required />
        </div>

        <div className="form-group">
          <label>Tagline</label>
          <input type="text" value={form.blogTagline ?? ''} onChange={(e) => setForm({ ...form, blogTagline: e.target.value })} placeholder="A short hook — shows under your blog name" />
        </div>

        <div className="form-group">
          <label>About / Bio</label>
          <textarea value={form.blogAbout ?? ''} onChange={(e) => setForm({ ...form, blogAbout: e.target.value })} rows={3} placeholder="What do you write about? Why should people subscribe?" />
        </div>

        <div className="form-group">
          <label>Blog Avatar</label>
          <ImageUploader images={blogImages} onChange={(urls) => { setBlogImages(urls); setForm((f) => ({ ...f, blogImage: urls[0] || '' })) }} maxImages={1} />
        </div>

        <div className="form-group">
          <label>Cover Image</label>
          <ImageUploader images={coverImages} onChange={(urls) => { setCoverImages(urls); setForm((f) => ({ ...f, blogCoverImage: urls[0] || '' })) }} maxImages={1} />
        </div>

        <div className="form-group">
          <label>Cover Style</label>
          <select value={form.blogCoverStyle} onChange={(e) => setForm((f) => ({ ...f, blogCoverStyle: e.target.value }))}>
            <option value="cover">Wide Cover</option>
            <option value="tile">Tile Pattern</option>
            <option value="gradient">Gradient</option>
          </select>
        </div>

        <div className="form-group">
          <label>Blog URL Slug</label>
          <input type="text" value={form.blogSlug ?? ''} onChange={(e) => setForm({ ...form, blogSlug: e.target.value })} placeholder="my-blog" />
          <small style={{ color: 'var(--text-secondary)' }}>xistrymemz.xyz/blog/{form.blogSlug || 'your-slug'}</small>
        </div>

        <div className="form-group">
          <label className={styles.toggleRow}>
            <input type="checkbox" checked={form.showBlog} onChange={(e) => setForm({ ...form, showBlog: e.target.checked })} />
            <span>Show blog publicly</span>
          </label>
        </div>

        <div className={styles.tiersBlock}>
          <div className={styles.tiersHeader}>
            <h3>💠 Subscription Tiers</h3>
            <p>Paid tiers unlock Subscribers-only and Paid posts. Fans can also donate one-off via your profile donation addresses.</p>
          </div>
          {tiers.length === 0 && (
            <p className={styles.emptyTiers}>No paid tiers yet — readers can still subscribe for free.</p>
          )}
          {tiers.map((t, i) => (
            <div key={t.id} className={styles.tierRow}>
              <input
                className={styles.tierInput}
                type="text"
                value={t.name}
                onChange={(e) => updateTier(i, { name: e.target.value })}
                placeholder="Tier name"
                aria-label="Tier name"
              />
              <input
                className={styles.tierPriceInput}
                type="number"
                min="0"
                step="any"
                value={t.price}
                onChange={(e) => updateTier(i, { price: parseFloat(e.target.value) || 0 })}
                aria-label="Tier price"
              />
              <select value={t.currency} onChange={(e) => updateTier(i, { currency: e.target.value })} aria-label="Currency">
                {['USD', 'XMR', 'XTM', 'ZANO', 'FUSD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" className={styles.removeTier} onClick={() => removeTier(i)} aria-label="Remove tier">✕</button>
              <input
                className={styles.tierDescInput}
                type="text"
                value={t.description || ''}
                onChange={(e) => updateTier(i, { description: e.target.value })}
                placeholder="What does this tier include?"
              />
            </div>
          ))}
          <button type="button" className={styles.addTier} onClick={addTier}>➕ Add tier</button>
        </div>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : form.blogSlug ? 'Save Blog Settings' : 'Create Blog'}
          </Button>
        </div>
      </form>

      {form.blogSlug && (
        <div className={styles.dangerZone}>
          <h3>Danger Zone</h3>
          <p>Unpublish hides your blog; delete removes it and all its posts.</p>
          <div className={styles.dangerActions}>
            <button onClick={() => setDeleteTarget('unpublish')} className={styles.unpublishBtn}>Unpublish Blog</button>
            <button onClick={() => setDeleteTarget('delete')} className={styles.deleteBtn}>Delete Blog</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          isOpen
          title={deleteTarget === 'unpublish' ? 'Unpublish this blog?' : 'Delete this blog forever?'}
          message={deleteTarget === 'unpublish'
            ? 'Your blog will be hidden from the directory but your posts stay saved.'
            : 'This permanently deletes your blog and all its posts. This cannot be undone.'}
          confirmLabel={deleteTarget === 'unpublish' ? 'Unpublish' : 'Delete'}
          cancelLabel="Cancel"
          onConfirm={deleteTarget === 'unpublish' ? handleUnpublish : handleDelete}
          onClose={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </div>
  )
}