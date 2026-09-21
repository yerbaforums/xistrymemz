'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/Breadcrumbs'
import EntityActions from '@/components/EntityActions'
import { useToast } from '@/context/ToastContext'
import { QRCodeModal } from '@/components/QRCodeModal'
import { CRYPTO_LOGOS } from '@/lib/constants'
import WorkTogether from '@/components/WorkTogether'

interface UserLink {
  id: string
  type: string
  url: string
  label: string | null
  icon: string | null
  sortOrder: number
}

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
}

interface BlogPostEntry {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  content: string
  visibility: string
  tier: string | null
  price: number
  currency: string
  tags: string | null
  viewCount: number
  likeCount: number
  publishedAt: string | null
  createdAt: string
  locked: boolean
  liked: boolean
  _count: { likes: number; purchases: number }
}

interface BlogData {
  id: string
  blogName: string | null
  blogAbout: string | null
  blogImage: string | null
  blogCoverImage: string | null
  blogCoverStyle: string
  blogSlug: string | null
  blogTagline: string | null
  blogTiers: string | null
  name: string | null
  username: string | null
  image: string | null
  userClass: string | null
  location: string | null
  website: string | null
  createdAt: string
  role: string
  userLinks: UserLink[]
  donationAddresses: DonationAddr[]
  postCount: number
  subscriberCount: number
  isOwner: boolean
}

interface Subscription {
  id: string
  tier: string
  price: number
  currency: string
  status: string
  expiresAt: string | null
}

interface Tier {
  id: string
  name: string
  price: number
  currency?: string
  description?: string
  expiresInDays?: number
}

const CLASS_ICONS: Record<string, string> = {
  Healer: '💚', Revealer: '👁️', Seer: '🔮', Teacher: '📚', Guide: '🧭',
  Warrior: '⚔️', Guardian: '🛡️', Sage: '🦉', Mystic: '✨', Architect: '🏗️',
  Artist: '🎨', Builder: '🔨', Explorer: '🌍', Mentor: '🌟',
}

const VISIBILITY_ICONS: Record<string, string> = {
  FREE: '🔓', SUBSCRIBERS: '💠', PAID: '💰',
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function CompactDonation({ donation }: { donation: DonationAddr }) {
  const [qrOpen, setQrOpen] = useState(false)
  const shortAddr = donation.address.length > 8
    ? donation.address.slice(0, 3) + '...' + donation.address.slice(-3)
    : donation.address

  return (
    <>
      <div className={styles.compactDonationCard} onClick={() => setQrOpen(true)}>
        <img src={`/crypto-logos/${CRYPTO_LOGOS[donation.currency] || 'ethereum.png'}`} alt="" width={14} height={14} />
        <span className={styles.compactDonationLabel}>{donation.label || donation.currency}</span>
        <code className={styles.compactDonationAddr} title={donation.address}>{shortAddr}</code>
      </div>
      {qrOpen && <QRCodeModal isOpen={true} onClose={() => setQrOpen(false)} currency={donation.label || donation.currency} address={donation.address} />}
    </>
  )
}

function LinkCard({ link }: { link: UserLink }) {
  const socialType = ['twitter', 'github', 'instagram', 'linkedin', 'youtube', 'tiktok', 'discord', 'telegram'].includes(link.type)
    ? link.type : 'website'
  const iconMap: Record<string, string> = {
    twitter: '/social-logos/twitter.svg', github: '/social-logos/github.svg',
    instagram: '/social-logos/instagram.svg', linkedin: '/social-logos/linkedin.svg',
    youtube: '/social-logos/youtube.svg', tiktok: '/social-logos/tiktok.svg',
    discord: '/social-logos/discord.svg', telegram: '/social-logos/telegram.svg',
    website: '🔗',
  }
  const iconSrc = link.icon || iconMap[socialType]
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.linkPill}>
      {iconSrc.startsWith('/') ? (
        <img src={iconSrc} alt={link.label || link.type} width={14} height={14} />
      ) : (
        <span>{iconSrc}</span>
      )}
      <span>{link.label || link.type}</span>
    </a>
  )
}

interface SubscribeModalProps {
  open: boolean
  onClose: () => void
  blogSlug: string
  tiers: Tier[]
  hasActiveSub: boolean
  currentTier: string | null
  onSubscribed: () => void
}

function SubscribeModal({ open, onClose, blogSlug, tiers, hasActiveSub, currentTier, onSubscribed }: SubscribeModalProps) {
  const { success, error, info } = useToast()
  const [selectedTier, setSelectedTier] = useState<string>('FREE')
  const [txHash, setTxHash] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && currentTier) setSelectedTier(currentTier)
  }, [open, currentTier])

  if (!open) return null

  const tierPrice = (id: string) => {
    const t = tiers.find((x) => x.id === id)
    return t ? t.price : 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/blog/${blogSlug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          txHash: txHash.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        if (selectedTier === 'FREE') {
          success('Subscribed! You\'ll be notified of new posts.')
          onSubscribed()
          onClose()
        } else if (data?.data?.status === 'ACTIVE') {
          success(`Subscribed to ${selectedTier}! Paid posts unlocked.`)
          onSubscribed()
          onClose()
        } else {
          info('Subscription request submitted — the author will approve it once payment is seen.')
          onSubscribed()
          onClose()
        }
      } else {
        error(data?.error || 'Failed to subscribe')
      }
    } catch {
      error('Failed to subscribe')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Subscribe to this blog</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className={styles.tierList}>
            <label className={`${styles.tierCard} ${selectedTier === 'FREE' ? styles.tierActive : ''}`}>
              <input type="radio" name="tier" value="FREE" checked={selectedTier === 'FREE'} onChange={() => setSelectedTier('FREE')} />
              <span className={styles.tierName}>Free</span>
              <span className={styles.tierDesc}>New posts + email updates (no paywall tiers)</span>
              <span className={styles.tierPrice}>$0</span>
            </label>
            {tiers.map((t) => (
              <label key={t.id} className={`${styles.tierCard} ${selectedTier === t.id ? styles.tierActive : ''}`}>
                <input type="radio" name="tier" value={t.id} checked={selectedTier === t.id} onChange={() => setSelectedTier(t.id)} />
                <span className={styles.tierName}>{t.name}</span>
                <span className={styles.tierDesc}>{t.description || 'Unlock paid posts on this blog'}</span>
                <span className={styles.tierPrice}>{t.price} {t.currency || 'USD'}{t.expiresInDays ? ` / ${t.expiresInDays}d` : ' / mo'}</span>
              </label>
            ))}
          </div>

          {selectedTier !== 'FREE' && (
            <div className={styles.formGroup}>
              <label htmlFor="txHash">Transaction hash (optional — paste after sending payment)</label>
              <input
                id="txHash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x... or payment confirmation"
              />
              <p className={styles.tierHint}>
                Send {tierPrice(selectedTier)} {tiers.find((t) => t.id === selectedTier)?.currency || 'USD'} equivalent to the author&apos;s donation address, then paste the confirmation.
              </p>
            </div>
          )}

          {hasActiveSub && (
            <p className={styles.tierHint}>You are already subscribed — this will upgrade your current tier.</p>
          )}

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Subscribing...' : hasActiveSub ? 'Update subscription' : 'Subscribe'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BlogDetailClient({ params }: { params: Promise<{ slug: string }> }) {
  const { success, error } = useToast()
  const [blog, setBlog] = useState<BlogData | null>(null)
  const [posts, setPosts] = useState<BlogPostEntry[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts')
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [qrDonation, setQrDonation] = useState<DonationAddr | null>(null)
  const [tipOpen, setTipOpen] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [tipCurrency, setTipCurrency] = useState('XTM')
  const [sendingTip, setSendingTip] = useState(false)

  useEffect(() => {
    let cancelled = false
    params.then((p) => { if (!cancelled) setResolvedSlug(p.slug) })
    return () => { cancelled = true }
  }, [params])

  const load = useCallback(async () => {
    if (!resolvedSlug) return
    const controller = new AbortController()
    try {
      const res = await fetch(`/api/blog/${resolvedSlug}`, { signal: controller.signal })
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      setBlog(data.data.blog)
      setPosts(data.data.posts || [])
      setSubscription(data.data.subscription || null)
    } catch {
      error('Failed to load blog')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [resolvedSlug, error])

  useEffect(() => { void load() }, [load])

  const tiers: Tier[] = (() => {
    try {
      return blog?.blogTiers ? JSON.parse(blog.blogTiers) : []
    } catch {
      return []
    }
  })()

  const hasActiveSub = !!subscription && subscription.status === 'ACTIVE'

  const sendTip = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(tipAmount)
    if (!blog || !amount || amount <= 0) {
      error('Enter a valid amount')
      return
    }
    setSendingTip(true)
    try {
      const res = await fetch('/api/users/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: blog.id, amount, currency: tipCurrency }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        success(data?.message || 'Tip sent!')
        setTipOpen(false)
        setTipAmount('')
      } else {
        error(data?.error || 'Failed to send tip')
      }
    } catch {
      error('Failed to send tip')
    } finally {
      setSendingTip(false)
    }
  }

  if (loading) {
    return <div className={styles.page}><Skeleton height={320} /><Skeleton height={200} /><Skeleton height={200} /></div>
  }

  if (!blog) {
    return (
      <div className={styles.page}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blogs', href: '/blogs' }, { label: 'Blog' }]} />
        <EmptyState icon="📝" title="Blog not found" description="This blog may have been unpublished or the link is wrong." />
      </div>
    )
  }

  const coverStyle = blog.blogCoverStyle === 'fill'
    ? { backgroundImage: `url(${blog.blogCoverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(135deg, #7c3aed22, #06b6d422), url(${blog.blogCoverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }

  return (
    <div className={styles.page}>
      <div className={styles.blogHeader}>
        {blog.blogCoverImage && <div className={styles.coverImage} style={coverStyle} />}
        {!blog.blogCoverImage && <div className={`${styles.coverImage} ${styles.coverGradient}`} />}
        <div className={styles.headerContent}>
          <div className={styles.avatarSection}>
            {blog.blogImage ? (
              <Image src={blog.blogImage} alt={blog.blogName || 'blog'} width={96} height={96} className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>{(blog.blogName || blog.name || 'B')[0].toUpperCase()}</div>
            )}
          </div>
          <div className={styles.blogInfo}>
            <h1>{blog.blogName || blog.name || 'Untitled Blog'}</h1>
            {blog.blogTagline && <p className={styles.tagline}>{blog.blogTagline}</p>}
            <div className={styles.meta}>
              <span className={styles.metaItem}>✍️ {blog.postCount} posts</span>
              <span className={styles.metaItem}>🔔 {blog.subscriberCount} subscribers</span>
              {blog.blogSlug && (
                <a className={styles.metaItem} href={`/blog/${blog.blogSlug}/feed.xml`} target="_blank" rel="noopener noreferrer">
                  📡 RSS
                </a>
              )}
            </div>
          </div>
          <div className={styles.actions}>
            {!blog.isOwner && (
              <>
                <Button variant="primary" onClick={() => setShowSubscribe(true)}>
                  {hasActiveSub ? (subscription?.tier !== 'FREE' ? `⭐ ${subscription.tier}` : '✅ Subscribed') : '🔔 Subscribe'}
                </Button>
                <Button variant="ghost" onClick={() => setTipOpen(true)}>💜 Support</Button>
              </>
            )}
            {blog.donationAddresses.length > 0 && (
              <div className={styles.compactDonations}>
                {blog.donationAddresses.slice(0, 2).map((da) => (
                  <CompactDonation key={da.id} donation={da} />
                ))}
                {blog.donationAddresses.length > 2 && (
                  <button className={styles.compactDonationMore} onClick={() => setActiveTab('about')}>
                    +{blog.donationAddresses.length - 2} more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {blog.blogSlug && (
        <EntityActions
          entityType="BLOG"
          entityId={blog.blogSlug}
          title={blog.blogName || blog.name || 'Blog'}
          authorId={blog.id}
          image={blog.blogImage}
          variant="bar"
        />
      )}
      <WorkTogether
        user={{ id: blog.id, name: blog.name, username: blog.username, image: blog.image }}
        entityType="BLOG"
        entityId={blog.blogSlug || blog.id}
        entityTitle={blog.blogName || blog.name || 'Blog'}
      />

      <div className={styles.tabs} role="tablist">
        <button className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`} onClick={() => setActiveTab('posts')}>
          Posts ({posts.length})
        </button>
        <button className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`} onClick={() => setActiveTab('about')}>
          About
        </button>
      </div>

      {activeTab === 'posts' && (
        <div className={styles.postsSection}>
          {posts.length === 0 && (
            <EmptyState icon="📝" title="No posts yet" description="This author hasn't published anything yet. Subscribe to be the first to know." />
          )}
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${resolvedSlug}/${p.slug}`} className={styles.postCard}>
              {p.coverImage && (
                <div className={styles.cardThumb}>
                  <img src={p.coverImage} alt="" />
                </div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.postMeta}>
                  <span className={styles.typeBadge}>{VISIBILITY_ICONS[p.visibility] || '📄'} {p.visibility === 'FREE' ? 'Free' : p.visibility === 'SUBSCRIBERS' ? 'Subscribers' : 'Paid'}</span>
                  {p.publishedAt && <span className={styles.postDate}>{new Date(p.publishedAt).toLocaleDateString()}</span>}
                </div>
                <h3 className={styles.postTitle}>{p.title}</h3>
                <p className={styles.postExcerpt}>{p.excerpt || stripHtml(p.content).slice(0, 140)}</p>
                <div className={styles.postFooter}>
                  <span>👁 {p.viewCount}</span>
                  <span>❤️ {p.likeCount}</span>
                  {p.locked && <span className={styles.lockedBadge}>🔒</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'about' && (
        <div className={styles.aboutSection}>
          <div className={styles.aboutBlock}>
            {blog.blogAbout ? (
              <div className={styles.aboutPreview}>{blog.blogAbout}</div>
            ) : (
              <p className={styles.aboutEmpty}>No about text yet.</p>
            )}
            <div className={styles.ownerMeta}>
              <span>{CLASS_ICONS[blog.userClass ?? ''] || '👤'} <b>{blog.name || 'Author'}</b></span>
              {blog.location && <span>📍 {blog.location}</span>}
              {blog.website && <a href={blog.website} target="_blank" rel="noopener noreferrer" className={styles.linkPill}>🔗 {blog.website}</a>}
            </div>
            {blog.userLinks.length > 0 && (
              <div className={styles.linksRow}>
                {blog.userLinks.map((l) => <LinkCard key={l.id} link={l} />)}
              </div>
            )}
            {blog.donationAddresses.length > 0 && (
              <div className={styles.donationsList}>
                <h4>💜 Donations</h4>
                {blog.donationAddresses.map((da) => (
                  <div key={da.id} className={styles.donationCardFull} onClick={() => setQrDonation(da)}>
                    <img src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`} alt="" width={18} height={18} />
                    <span>{da.label || da.currency}</span>
                    <code>{da.address}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSubscribe && (
        <SubscribeModal
          open={showSubscribe}
          onClose={() => setShowSubscribe(false)}
          blogSlug={resolvedSlug || ''}
          tiers={tiers}
          hasActiveSub={hasActiveSub}
          currentTier={subscription?.tier || null}
          onSubscribed={() => { void load() }}
        />
      )}

      {tipOpen && (
        <div className={styles.modalOverlay} onClick={() => setTipOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>💜 Support {blog.blogName || 'this author'}</h3>
              <button className={styles.modalClose} onClick={() => setTipOpen(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={sendTip}>
              <div className={styles.formGroup}>
                <label htmlFor="tipAmount">Amount</label>
                <input id="tipAmount" type="number" min="0" step="any" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="tipCurrency">Currency</label>
                <select id="tipCurrency" value={tipCurrency} onChange={(e) => setTipCurrency(e.target.value)}>
                  {['XMR', 'XTM', 'ZANO', 'FUSD', 'USD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.formActions}>
                <Button type="submit" variant="primary" disabled={sendingTip}>{sendingTip ? 'Sending...' : 'Send tip'}</Button>
                <Button type="button" variant="ghost" onClick={() => setTipOpen(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrDonation && (
        <QRCodeModal isOpen={true} onClose={() => setQrDonation(null)} currency={qrDonation.label || qrDonation.currency} address={qrDonation.address} />
      )}
    </div>
  )
}