'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import ImageUploader from '@/components/ImageUploader'
import MentionInput from '@/components/MentionInput'
import { CRYPTO_LOGOS } from '@/lib/constants'
import RoleBadge from '@/components/RoleBadge'
import Rating from '@/components/Rating'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface UserLink {
  id: string
  type: string
  url: string
  label?: string | null
  icon?: string | null
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

interface ShopData {
  shopName: string | null
  shopAbout: string | null
  shopImage: string | null
  shopCoverImage: string | null
  shopSlug: string | null
  user: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    userClass: string | null
    location: string | null
    website: string | null
    createdAt: string
    role: string
  }
  links: UserLink[]
  donationAddresses: DonationAddr[]
  productCount: number
  ratingCount: number
  avgRating: number
  products: Array<{
    id: string
    title: string
    description: string | null
    price: number | null
    type: string
    category: string | null
    condition: string | null
    location: string | null
    imageUrl: string | null
    published: boolean
    pinned: boolean
    createdAt: string
  }>
  posts: Array<{
    id: string
    content: string
    imageUrl: string | null
    pinned: boolean
    likes: number
    createdAt: string
    user: { id: string; name: string | null; image: string | null }
  }>
}

const CLASS_ICONS: Record<string, string> = {
  Healer: '💚', Revealer: '👁️', Seer: '🔮', Teacher: '📚', Guide: '🧭',
  Warrior: '⚔️', Guardian: '🛡️', Sage: '🦉', Mystic: '✨', Architect: '🏗️',
  Artist: '🎨', Builder: '🔨', Explorer: '🌍', Mentor: '🌟'
}

function LinkCard({ link }: { link: UserLink }) {
  const socialType = ['twitter', 'github', 'instagram', 'linkedin', 'youtube', 'tiktok', 'discord', 'telegram'].includes(link.type)
    ? link.type : 'website'
  const iconMap: Record<string, string> = {
    twitter: '/social-logos/twitter.svg', github: '/social-logos/github.svg',
    instagram: '/social-logos/instagram.svg', linkedin: '/social-logos/linkedin.svg',
    youtube: '/social-logos/youtube.svg', tiktok: '/social-logos/tiktok.svg',
    discord: '/social-logos/discord.svg', telegram: '/social-logos/telegram.svg',
    website: '🔗'
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

export default function ShopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [shop, setShop] = useState<ShopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'posts' | 'reviews' | 'about'>('products')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ shopName: '', shopAbout: '', shopImage: '', shopCoverImage: '' })
  const [saving, setSaving] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null)
  const [qrDonation, setQrDonation] = useState<DonationAddr | null>(null)

  useEffect(() => { params.then(p => setResolvedSlug(p.slug)) }, [params])

  useEffect(() => {
    if (!resolvedSlug) return
    fetch(`/api/shop/public/${resolvedSlug}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setShop(data)
        setIsOwner(session?.user?.id === data.user.id)
        setEditForm({
          shopName: data.shopName || '',
          shopAbout: data.shopAbout || '',
          shopImage: data.shopImage || '',
          shopCoverImage: data.shopCoverImage || ''
        })
      })
      .catch(() => error('Failed to load shop'))
      .finally(() => setLoading(false))
  }, [resolvedSlug])

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        success('Shop updated!')
        setShowEditModal(false)
        if (resolvedSlug) {
          fetch(`/api/shop/public/${resolvedSlug}`)
            .then(r => r.json())
            .then(data => setShop(data))
        }
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update shop')
      }
    } catch {
      error('Failed to update shop')
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim() || !shop) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost, images: newPostImages.length > 0 ? newPostImages : undefined })
      })
      if (res.ok) {
        setNewPost('')
        setNewPostImages([])
        if (resolvedSlug) {
          fetch(`/api/shop/public/${resolvedSlug}`)
            .then(r => r.json())
            .then(data => setShop(data))
        }
        success('Post published!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to post')
      }
    } catch {
      error('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const handleLikePost = async (postId: string, currentLikes: number) => {
    try {
      await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes: currentLikes + 1 })
      })
      if (resolvedSlug) {
        fetch(`/api/shop/public/${resolvedSlug}`)
          .then(r => r.json())
          .then(data => setShop(data))
      }
    } catch { /* ignore */ }
  }

  const handlePin = async (type: string, id: string, currentPinned: boolean) => {
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, pinned: !currentPinned })
      })
      if (res.ok && resolvedSlug) {
        fetch(`/api/shop/public/${resolvedSlug}`).then(r => r.json()).then(data => setShop(data))
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className={styles.loading}>Loading shop...</div>
  if (!shop) return <div className={styles.error}>Shop not found</div>

  const userClasses = shop.user.userClass?.split(',').map(c => c.trim()).filter(Boolean) || []

  return (
    <div className={styles.page}>
      <nav className="breadcrumbs">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/shops" className="breadcrumb-link">Shops</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">{shop.shopName || 'Shop'}</span>
      </nav>

      <div className={styles.shopHeader}>
        <div
          className={styles.coverImage}
          style={{ backgroundImage: shop.shopCoverImage ? `url(${shop.shopCoverImage})` : undefined }}
        >
          {!shop.shopCoverImage && <div className={styles.coverGradient} />}
        </div>
        <div className={styles.headerContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {shop.shopImage ? (
                <img src={shop.shopImage} alt={shop.shopName || 'Shop'} />
              ) : (
                <span>🏪</span>
              )}
            </div>
          </div>
          <div className={styles.shopInfo}>
            <div className={styles.nameRow}>
              <h1>{shop.shopName || 'Untitled Shop'}</h1>
              <RoleBadge role={shop.user.role} />
            </div>
            {userClasses.length > 0 && (
              <div className={styles.classes}>
                {userClasses.map(cls => (
                  <span key={cls} className={styles.classBadge}>
                    <span className={styles.classIcon}>{CLASS_ICONS[cls] || '👤'}</span>
                    {cls}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.meta}>
              {shop.user.location && (
                <span className={styles.metaItem}>
                  <span>📍</span> {shop.user.location}
                </span>
              )}
              {shop.user.website && (
                <a href={shop.user.website.startsWith('http') ? shop.user.website : `https://${shop.user.website}`} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
                  <span>🔗</span> {shop.user.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className={styles.metaItem}>
                <span>📅</span> Joined {new Date(shop.user.createdAt).toLocaleDateString()}
              </span>
            </div>
            {(shop.links && shop.links.length > 0) && (
              <div className={styles.compactLinks}>
                {shop.links.slice(0, 6).map(link => (
                  <LinkCard key={link.id} link={link} />
                ))}
                {shop.links.length > 6 && (
                  <span className={styles.compactMore}>+{shop.links.length - 6} more</span>
                )}
              </div>
            )}
            {shop.donationAddresses.length > 0 && (
              <div className={styles.compactDonations}>
                {shop.donationAddresses.slice(0, 2).map(da => (
                  <CompactDonation key={da.id} donation={da} />
                ))}
                {shop.donationAddresses.length > 2 && (
                  <button className={styles.compactDonationMore} onClick={() => setActiveTab('about')}>
                    +{shop.donationAddresses.length - 2} more
                  </button>
                )}
              </div>
            )}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{shop.productCount}</span>
                <span className={styles.statLabel}>Products</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{shop.ratingCount}</span>
                <span className={styles.statLabel}>Reviews</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{shop.avgRating > 0 ? shop.avgRating.toFixed(1) : '—'}</span>
                <span className={styles.statLabel}>Rating</span>
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <Link href={getUserProfileUrl(shop.user)} className={styles.viewOwnerBtn}>
              View Owner Profile
            </Link>
            {isOwner && (
              <button onClick={() => { setShowEditModal(true); setActiveTab('about'); }} className={styles.editBtn}>
                Edit Shop
              </button>
            )}
          </div>
        </div>
      </div>

      {shop.shopAbout && (
        <div className={styles.aboutPreview}>
          <p>{shop.shopAbout}</p>
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'products' ? styles.active : ''}`} onClick={() => setActiveTab('products')}>
          Products ({shop.products.length})
        </button>
        <button className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`} onClick={() => setActiveTab('posts')}>
          Posts ({shop.posts.length})
        </button>
        <button className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`} onClick={() => setActiveTab('reviews')}>
          Reviews
        </button>
        <button className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`} onClick={() => setActiveTab('about')}>
          About
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'products' && (
          <div className={styles.productsGrid}>
            {shop.products.length > 0 ? (
              shop.products.map(product => (
                <div key={product.id} className={styles.productCardWrapper}>
                  <Link href={`/products/${product.id}`} className={styles.productCard}>
                    {product.pinned && <span className={styles.pinnedBadge}>📌</span>}
                    {product.imageUrl ? (
                      <div className={styles.productImage}>
                        <img src={product.imageUrl} alt={product.title} />
                      </div>
                    ) : (
                      <div className={styles.productImagePlaceholder}>📦</div>
                    )}
                    <div className={styles.productInfo}>
                      <span className={`badge badge-${product.type.toLowerCase()}`}>{product.type}</span>
                      {product.category && <span className={styles.productCategory}>{product.category}</span>}
                      <h3>{product.title}</h3>
                      {product.price && <p className={styles.price}>${product.price}</p>}
                      {product.condition && <p className={styles.condition}>{product.condition.replace('_', ' ')}</p>}
                    </div>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => handlePin('product', product.id, product.pinned)}
                      className={`${styles.pinBtn} ${product.pinned ? styles.pinBtnActive : ''}`}
                      title={product.pinned ? 'Unpin' : 'Pin to top'}
                    >
                      {product.pinned ? '📌' : '📍'}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.empty}><p>No products listed yet</p></div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className={styles.postsSection}>
            {isOwner && (
              <form onSubmit={handleCreatePost} className={styles.createPost}>
                <MentionInput
                  value={newPost}
                  onChange={setNewPost}
                  placeholder="Share an update with your customers..."
                  className={styles.postInput}
                  rows={3}
                />
                <ImageUploader images={newPostImages} onChange={setNewPostImages} maxImages={6} />
                <div className={styles.postActions}>
                  <span className={styles.charCount}>{newPost.length}/2000</span>
                  <button type="submit" disabled={posting || !newPost.trim()} className={styles.postBtn}>
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            )}
            {shop.posts.length > 0 ? (
              <div className={styles.postsList}>
                {shop.posts.map(post => (
                  <div key={post.id} className={`${styles.postCard} ${post.pinned ? styles.pinnedCard : ''}`}>
                    <div className={styles.postHeader}>
                      <div className={styles.postAuthor}>
                        <div className={styles.postAvatarSmall}>
                          {post.user.image ? <img src={post.user.image} alt="" /> : <span>{post.user.name?.[0] || 'U'}</span>}
                        </div>
                        <div>
                          <span className={styles.postAuthorName}>{post.user.name || 'Shop'}</span>
                          <span className={styles.postDate}>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {isOwner && (
                          <button
                            onClick={() => handlePin('post', post.id, post.pinned)}
                            className={`${styles.pinBtn} ${post.pinned ? styles.pinBtnActive : ''}`}
                            title={post.pinned ? 'Unpin' : 'Pin to top'}
                          >
                            {post.pinned ? '📌' : '📍'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                    {post.imageUrl && (
                      <div className={styles.postImage}>
                        <img src={post.imageUrl} alt="" style={{maxWidth:'100%', borderRadius:'8px', marginTop:'8px'}} />
                      </div>
                    )}
                    <div className={styles.postFooter}>
                      <span className={styles.postLikes}>♥ {post.likes}</span>
                      <button onClick={() => handleLikePost(post.id, post.likes)} className={styles.likeBtn}>Like</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}><p>No posts yet</p></div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className={styles.reviewsSection}>
            <Rating userId={shop.user.id} type="SELLER" />
          </div>
        )}

        {activeTab === 'about' && (
          <div className={styles.aboutSection}>
            {isOwner && showEditModal ? (
              <form onSubmit={handleSaveShop} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>Shop Name</label>
                  <input type="text" value={editForm.shopName} onChange={e => setEditForm({ ...editForm, shopName: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>About</label>
                  <textarea value={editForm.shopAbout} onChange={e => setEditForm({ ...editForm, shopAbout: e.target.value })} rows={4} />
                </div>
                <div className={styles.formGroup}>
                  <label>Shop Logo</label>
                  <ImageUploader images={editForm.shopImage ? [editForm.shopImage] : []} onChange={urls => setEditForm({ ...editForm, shopImage: urls[0] || '' })} maxImages={1} />
                </div>
                <div className={styles.formGroup}>
                  <label>Cover Image</label>
                  <ImageUploader images={editForm.shopCoverImage ? [editForm.shopCoverImage] : []} onChange={urls => setEditForm({ ...editForm, shopCoverImage: urls[0] || '' })} maxImages={1} />
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  <button type="button" className="btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                {shop.shopAbout && (
                  <div className={styles.aboutBlock}>
                    <h3>About This Shop</h3>
                    <p>{shop.shopAbout}</p>
                  </div>
                )}
                <div className={styles.aboutBlock}>
                  <h3>Owner</h3>
                  <Link href={getUserProfileUrl(shop.user)} className={styles.ownerLink}>
                    {shop.user.name || 'Anonymous'}
                  </Link>
                  {shop.user.location && <p className={styles.ownerMeta}>📍 {shop.user.location}</p>}
                  <p className={styles.ownerMeta}>Member since {new Date(shop.user.createdAt).toLocaleDateString()}</p>
                </div>
                {shop.donationAddresses.length > 0 && (
                  <div className={styles.aboutBlock}>
                    <h3>Support This Shop</h3>
                    <div className={styles.donationsList}>
                      {shop.donationAddresses.map(da => (
                        <div key={da.id} className={styles.donationCardFull}>
                          <div className={styles.donationInfo}>
                            <img src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`} alt="" width={24} height={24} />
                            <div>
                              <div className={styles.donationLabel}>{da.label || da.currency}</div>
                              <code className={styles.donationAddress} title={da.address}>
                                {da.address.length > 20 ? da.address.slice(0, 10) + '...' + da.address.slice(-8) : da.address}
                              </code>
                            </div>
                          </div>
                          <DonationActions address={da.address} size="md" onQrClick={() => setQrDonation(da)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {qrDonation && (
        <QRCodeModal isOpen={true} onClose={() => setQrDonation(null)} currency={qrDonation.label || qrDonation.currency} address={qrDonation.address} />
      )}
    </div>
  )
}
