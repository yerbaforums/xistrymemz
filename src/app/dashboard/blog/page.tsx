'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './blog.module.css'
import { useToast } from '@/context/ToastContext'
import Loading from '@/components/Loading'
import Button from '@/components/ui/Button'
import RichEditor from '@/components/RichEditor'
import AdvancedSection from '@/components/AdvancedSection'
import ImageUploader from '@/components/ImageUploader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import ListingToolbar, { type PillOption } from '@/components/ListingToolbar'
import { useManagedList } from '@/hooks/useManagedList'
import { downloadCSV } from '@/lib/csv'

interface BlogInfo {
  blogName: string | null
  blogSlug: string | null
  blogTagline: string | null
  blogTiers: string | null
  showBlog: boolean
}

interface PostItem {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  coverImage: string | null
  status: string
  visibility: string
  tier: string | null
  price: number
  currency: string
  tags: string | null
  viewCount: number
  likeCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
  _count: { likes: number; purchases: number; tips: number }
}

interface SubscriptionItem {
  id: string
  tier: string
  price: number
  currency: string
  status: string
  txHash: string | null
  startedAt: string
  expiresAt: string | null
  subscriber: { id: string; name: string | null; image: string | null; username: string | null; email: string | null }
}

interface PurchaseItem {
  id: string
  amount: number
  currency: string
  status: string
  txHash: string | null
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
  post: { id: string; title: string; slug: string }
}

interface Tier {
  id: string
  name: string
  price: number
  currency?: string
}

const VISIBILITY_LABELS: Record<string, string> = {
  FREE: '🔓 Free',
  SUBSCRIBERS: '💠 Subscribers',
  PAID: '💰 Paid',
}

type PostForm = {
  title: string
  excerpt: string
  content: string
  coverImage: string
  status: 'DRAFT' | 'PUBLISHED'
  visibility: 'FREE' | 'SUBSCRIBERS' | 'PAID'
  tier: string
  price: string
  tags: string
}

const EMPTY_FORM: PostForm = {
  title: '', excerpt: '', content: '', coverImage: '',
  status: 'DRAFT', visibility: 'FREE', tier: '', price: '', tags: '',
}

export default function BlogDashboard() {
  const { success, error } = useToast()
  const [blog, setBlog] = useState<BlogInfo | null>(null)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [stats, setStats] = useState({ activeSubs: 0, tips: 0, earnings: 0 })
  const [loading, setLoading] = useState(true)

  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PostForm>(EMPTY_FORM)
  const [coverImages, setCoverImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [shareToFeed, setShareToFeed] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const managed = useManagedList()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/blog/manage')
      if (!res.ok) {
        setBlog(null)
        return
      }
      const data = await res.json()
      const d = data?.data
      setBlog(d.blog)
      setPosts(d.posts || [])
      setSubscriptions(d.subscriptions || [])
      setPurchases(d.purchases || [])
      setStats({
        activeSubs: d.activeSubscriberCount || 0,
        tips: d.tipsCount || 0,
        earnings: d.earnings?.total || 0,
      })
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const tiers: Tier[] = (() => {
    try {
      return blog?.blogTiers ? JSON.parse(blog.blogTiers) : []
    } catch { return [] }
  })()

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setCoverImages([])
    setShowEditor(true)
  }

  const openEdit = (p: PostItem) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      excerpt: p.excerpt || '',
      content: p.content,
      coverImage: p.coverImage || '',
      status: p.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      visibility: (p.visibility as PostForm['visibility']) || 'FREE',
      tier: p.tier || '',
      price: p.price ? String(p.price) : '',
      tags: (() => {
        try { return JSON.parse(p.tags || '[]').join(', ') } catch { return '' }
      })(),
    })
    setCoverImages(p.coverImage ? [p.coverImage] : [])
    setShowEditor(true)
  }

  const savePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blog?.blogSlug) {
      error('Create your blog first')
      return
    }
    if (!form.title.trim() || !form.content.trim()) {
      error('Title and content are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: coverImages[0] || null,
        status: form.status,
        visibility: form.visibility,
        tier: form.visibility !== 'FREE' ? form.tier || undefined : undefined,
        price: form.visibility === 'PAID' ? parseFloat(form.price) || 0 : 0,
        currency: 'USD',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      let res: Response
      if (editingId) {
        res = await fetch(`/api/blog/posts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/blog/${blog.blogSlug}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      const data = await res.json().catch(() => null)
      if (res.ok) {
        success(editingId ? 'Post updated!' : (payload.status === 'PUBLISHED' ? 'Post published!' : 'Draft saved!'))
        // New publications surface in the feed automatically (opt-out via checkbox).
        const wasDraft = editingId ? (posts.find((p) => p.id === editingId)?.status !== 'PUBLISHED') : true
        if (shareToFeed && payload.status === 'PUBLISHED' && wasDraft && blog?.blogSlug) {
          fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `New article: ${payload.title}`,
              referenceType: 'BLOG',
              referenceId: blog.blogSlug,
              referenceTitle: payload.title,
            }),
          }).catch(() => {})
        }
        setShowEditor(false)
        void load()
      } else {
        error(data?.error || 'Failed to save post')
      }
    } catch {
      error('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const cancelPost = async () => {
    if (!deletingId) return
    const res = await fetch(`/api/blog/posts/${deletingId}`, { method: 'DELETE' })
    if (res.ok) {
      success('Post deleted')
      setDeletingId(null)
      void load()
    } else error('Failed to delete')
  }

  const approveSubscription = async (id: string, action: 'approve' | 'cancel') => {
    if (!blog?.blogSlug) return
    const res = await fetch(`/api/blog/${blog.blogSlug}/subscribe`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: id, action }),
    })
    if (res.ok) {
      success(action === 'approve' ? 'Subscription approved' : 'Subscription cancelled')
      void load()
    } else error('Failed to update subscription')
  }

  const approvePurchase = async (postId: string, id: string, action: 'approve' | 'cancel') => {
    const res = await fetch(`/api/blog/posts/${postId}/purchase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId: id, action }),
    })
    if (res.ok) {
      success(action === 'approve' ? 'Purchase approved — post unlocked' : 'Purchase cancelled')
      void load()
    } else error('Failed to update purchase')
  }

  if (loading) return <Loading size="medium" />

  if (!blog?.blogSlug) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>✍️ My Blog</h1>
        </div>
        <div className={styles.promptCard}>
          <EmptyState
            icon="📝"
            title="You haven't started a blog yet"
            description="Create a blog to publish long-form posts with subscriptions and donations."
            action={{ label: 'Start a Blog', href: '/blog/setup' }}
          />
        </div>
      </div>
    )
  }

  const published = posts.filter((p) => p.status === 'PUBLISHED')
  const drafts = posts.filter((p) => p.status !== 'PUBLISHED')
  const pendingSubs = subscriptions.filter((s) => s.status === 'PENDING')
  const pendingPurchases = purchases.filter((p) => p.status === 'PENDING')

  const postQuery = managed.search.trim().toLowerCase()
  const matchesPost = (p: PostItem) =>
    !postQuery ||
    p.title.toLowerCase().includes(postQuery) ||
    (p.excerpt || '').toLowerCase().includes(postQuery) ||
    (p.slug || '').toLowerCase().includes(postQuery)
  const shownPublished = published.filter(p => matchesPost(p) && (managed.filter === 'all' || managed.filter === 'published'))
  const shownDrafts = drafts.filter(p => matchesPost(p) && (managed.filter === 'all' || managed.filter === 'draft'))

  const postPills: PillOption[] = [
    { value: 'all', label: 'All', count: posts.length },
    { value: 'published', label: '✓ Published', count: published.length },
    { value: 'draft', label: 'Draft', count: drafts.length },
  ]

  const exportPostsCSV = () => {
    downloadCSV(
      `blog-posts-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Title', 'Status', 'Visibility', 'Price', 'Views', 'Likes'],
      [...shownPublished, ...shownDrafts].map(p => [
        p.title,
        p.status === 'PUBLISHED' ? 'published' : 'draft',
        VISIBILITY_LABELS[p.visibility] || p.visibility,
        p.visibility !== 'FREE' ? `${p.price} ${p.currency}` : 'free',
        p.viewCount,
        p.likeCount,
      ]),
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>✍️ My Blog</h1>
          <p className={styles.subtitle}>{blog.blogTagline || 'Manage posts, subscribers, and earnings'}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/blog/${blog.blogSlug}`} className="btn-secondary">🌐 View Blog</Link>
          <Link href="/blog/setup" className="btn-secondary">⚙️ Blog Settings</Link>
          <Button variant="primary" onClick={openNew}>✏️ New Post</Button>
        </div>
      </div>

      <div className={styles.statCards}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📄</div>
          <div className={styles.statValue}>{published.length}</div>
          <div className={styles.statLabel}>Published</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📝</div>
          <div className={styles.statValue}>{drafts.length}</div>
          <div className={styles.statLabel}>Drafts</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔔</div>
          <div className={styles.statValue}>{stats.activeSubs}</div>
          <div className={styles.statLabel}>Active subscribers</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statValue}>{stats.earnings.toFixed(2)}</div>
          <div className={styles.statLabel}>Earnings (est.)</div>
        </div>
      </div>

      {pendingSubs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⏳ Pending subscriptions</h2>
          {pendingSubs.map((s) => (
            <div key={s.id} className={styles.pendingRow}>
              <div className={styles.pendingInfo}>
                <span className={styles.pendingAvatar}>{s.subscriber.name?.[0] || '?'}</span>
                <div>
                  <strong>{s.subscriber.name || s.subscriber.username || 'Member'}</strong>
                  <span className={styles.pendingMeta}>{s.tier} · {s.price} {s.currency}{s.txHash ? ' · tx ' + s.txHash.slice(0, 10) : ''}</span>
                </div>
              </div>
              <div className={styles.pendingActions}>
                <Button size="sm" variant="primary" onClick={() => approveSubscription(s.id, 'approve')}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => approveSubscription(s.id, 'cancel')}>Cancel</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingPurchases.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⏳ Pending purchases</h2>
          {pendingPurchases.map((p) => (
            <div key={p.id} className={styles.pendingRow}>
              <div className={styles.pendingInfo}>
                <span className={styles.pendingAvatar}>{p.user.name?.[0] || '?'}</span>
                <div>
                  <strong>{p.user.name || 'Member'}</strong>
                  <span className={styles.pendingMeta}>Unlock “{p.post.title.slice(0, 40)}” · {p.amount} {p.currency}{p.txHash ? ' · tx ' + p.txHash.slice(0, 10) : ''}</span>
                </div>
              </div>
              <div className={styles.pendingActions}>
                <Button size="sm" variant="primary" onClick={() => approvePurchase(p.post.id, p.id, 'approve')}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => approvePurchase(p.post.id, p.id, 'cancel')}>Cancel</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📄 Posts</h2>
        {posts.length === 0 && (
          <EmptyState icon="✏️" title="No posts yet" description="Write your first post — it can start as a draft and go live whenever you're ready." />
        )}
        {posts.length > 0 && (
          <ListingToolbar
            search={managed.search}
            onSearch={managed.setSearch}
            searchPlaceholder="Search posts by title or excerpt..."
            pills={postPills}
            activePill={managed.filter}
            onPillChange={managed.setFilter}
            count={shownPublished.length + shownDrafts.length}
            countLabel="posts"
            onExport={exportPostsCSV}
          />
        )}
        {posts.length > 0 && shownPublished.length + shownDrafts.length === 0 && (
          <p className={styles.emptyText}>No posts match your search or filter.</p>
        )}
        <div className={styles.postList}>
          {shownPublished.map((p) => (
            <div key={p.id} className={styles.postRow}>
              <div className={styles.postInfo}>
                <Link href={`/blog/${blog.blogSlug}/${p.slug}`} className={styles.postTitleLink}>{p.title}</Link>
                <span className={styles.postMeta}>
                  {VISIBILITY_LABELS[p.visibility] || p.visibility}
                  {p.visibility !== 'FREE' && ` · ${p.price} ${p.currency}`}
                  {' · '}👁 {p.viewCount} · ❤️ {p.likeCount}
                  {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString()}`}
                </span>
              </div>
              <div className={styles.postActions}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeletingId(p.id)}>Delete</Button>
              </div>
            </div>
          ))}
          {shownDrafts.map((p) => (
            <div key={p.id} className={`${styles.postRow} ${styles.draftRow}`}>
              <div className={styles.postInfo}>
                <span className={styles.postTitleLink}>{p.title} <span className={styles.draftBadge}>DRAFT</span></span>
                <span className={styles.postMeta}>
                  {VISIBILITY_LABELS[p.visibility] || p.visibility} · updated {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.postActions}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeletingId(p.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🔔 Subscribers ({subscriptions.length})</h2>
        {subscriptions.length === 0 && (
          <p className={styles.emptyText}>No subscribers yet — share your blog to grow your audience.</p>
        )}
        <div className={styles.subList}>
          {subscriptions.map((s) => (
            <div key={s.id} className={styles.subRow}>
              <div className={styles.pendingInfo}>
                <span className={styles.pendingAvatar}>{s.subscriber.name?.[0] || '?'}</span>
                <div>
                  <strong>{s.subscriber.name || s.subscriber.username || s.subscriber.email || 'Member'}</strong>
                  <span className={styles.pendingMeta}>
                    {s.tier === 'FREE' ? 'Free' : `${s.tier} · ${s.price} ${s.currency}`} · {s.status}
                    {s.expiresAt && ` · until ${new Date(s.expiresAt).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showEditor && (
        <div className={styles.modalOverlay} onClick={() => setShowEditor(false)}>
          <div className={styles.editorModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'Edit post' : 'New post'}</h3>
              <button className={styles.modalClose} onClick={() => setShowEditor(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={savePost}>
              <div className={styles.editorGrid}>
                <div className={styles.editorMain}>
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title" required />
                  </div>
                  <div className="form-group">
                    <label>Excerpt (optional, shown in listings)</label>
                    <input type="text" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="A short summary" />
                  </div>
                  <div className="form-group">
                    <label>Content</label>
                    <RichEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Write your post…" minHeight={260} />
                  </div>
                </div>
                <div className={styles.editorSide}>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PostForm['status'] })}>
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Publish now</option>
                    </select>
                  </div>
                  <AdvancedSection label="Monetization & discovery">
                  <div className="form-group">
                    <label>Visibility</label>
                    <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as PostForm['visibility'] })}>
                      <option value="FREE">Free — everyone</option>
                      <option value="SUBSCRIBERS">Subscribers only</option>
                      <option value="PAID">Paid — unlock purchase</option>
                    </select>
                  </div>
                  {form.visibility !== 'FREE' && (
                    <>
                      <div className="form-group">
                        <label>{form.visibility === 'PAID' ? 'Price (USD)' : 'Required tier'}</label>
                        {form.visibility === 'PAID' ? (
                          <input type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5.00" />
                        ) : (
                          <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                            <option value="">Any subscriber</option>
                            {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        )}
                      </div>
                      {tiers.length === 0 && form.visibility === 'SUBSCRIBERS' && (
                        <p className={styles.hint}>No paid tiers configured — any active subscriber unlocks this post.</p>
                      )}
                    </>
                  )}
                  </AdvancedSection>
                  <div className="form-group">
                    <label>Cover image</label>
                    <ImageUploader images={coverImages} onChange={(urls) => { setCoverImages(urls); setForm((f) => ({ ...f, coverImage: urls[0] || '' })) }} maxImages={1} />
                  </div>
                  <div className="form-group">
                    <label>Tags (comma separated)</label>
                    <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="travel, crypto, guides" />
                  </div>
                </div>
              </div>
              <div className={styles.formActions} style={{ alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: 'auto' }}>
                  <input type="checkbox" checked={shareToFeed} onChange={(e) => setShareToFeed(e.target.checked)} />
                  Share to feed on publish
                </label>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : form.status === 'PUBLISHED' ? 'Publish post' : 'Save draft'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingId && (
        <ConfirmDialog
          isOpen
          title="Delete this post?"
          message="This permanently deletes the post and any purchases/tipped associated with it."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={cancelPost}
          onClose={() => setDeletingId(null)}
          variant="danger"
        />
      )}
    </div>
  )
}