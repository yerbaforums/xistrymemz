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
import BookAppointmentModal from '@/components/BookAppointmentModal'
import ShareToPostModal from '@/components/ShareToPostModal'
import HashtagInput from '@/components/HashtagInput'
import { CRYPTO_LOGOS } from '@/lib/constants'
import RoleBadge from '@/components/RoleBadge'
import Rating from '@/components/Rating'

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

interface SchoolContent {
  id: string
  title: string
  content: string
  contentType: string
  price: number | null
  isPaid: boolean
  isSubscription: boolean
  pinned: boolean
  createdAt: string
  hashtags?: { id: string; tag: string }[]
  user: {
    id: string
    name: string | null
    image: string | null
    schoolName: string | null
    schoolSlug: string | null
  }
}

interface SchoolPost {
  id: string
  content: string
  imageUrl: string | null
  pinned: boolean
  likes: number
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface SchoolData {
  schoolName: string | null
  schoolAbout: string | null
  schoolImage: string | null
  schoolCoverImage: string | null
  schoolCoverStyle: string
  schoolSlug: string | null
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
  contentCount: number
  avgRating: number
  ratingCount: number
  schoolContents: SchoolContent[]
  posts: SchoolPost[]
}

const CLASS_ICONS: Record<string, string> = {
  Healer: '💚', Revealer: '👁️', Seer: '🔮', Teacher: '📚', Guide: '🧭',
  Warrior: '⚔️', Guardian: '🛡️', Sage: '🦉', Mystic: '✨', Architect: '🏗️',
  Artist: '🎨', Builder: '🔨', Explorer: '🌍', Mentor: '🌟'
}

const CONTENT_TYPE_ICONS: Record<string, string> = {
  article: '📄', lesson: '📖', note: '📝', guide: '🗺️', course: '🎓', resource: '📦'
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

export default function SchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'posts' | 'reviews' | 'about'>('content')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ schoolName: '', schoolAbout: '', schoolImage: '', schoolCoverImage: '', schoolCoverStyle: 'cover' })
  const [saving, setSaving] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareContent, setShareContent] = useState<SchoolContent | null>(null)
  const [posting, setPosting] = useState(false)
  const [showContentForm, setShowContentForm] = useState(false)
  const [contentForm, setContentForm] = useState({ title: '', content: '', contentType: 'article', price: '', isPaid: false })
  const [contentHashtags, setContentHashtags] = useState<string[]>([])
  const [creatingContent, setCreatingContent] = useState(false)
  const [selectedContent, setSelectedContent] = useState<SchoolContent | null>(null)
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null)

  useEffect(() => { params.then(p => setResolvedSlug(p.slug)) }, [params])

  useEffect(() => {
    if (!resolvedSlug) return
    fetch(`/api/school/${resolvedSlug}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setSchool(data)
        setIsOwner(session?.user?.id === data.user.id)
        setEditForm({
          schoolName: data.schoolName || '',
          schoolAbout: data.schoolAbout || '',
          schoolImage: data.schoolImage || '',
          schoolCoverImage: data.schoolCoverImage || '',
          schoolCoverStyle: data.schoolCoverStyle || 'cover'
        })
      })
      .catch(() => error('Failed to load school'))
      .finally(() => setLoading(false))
  }, [resolvedSlug])

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        success('School updated!')
        setShowEditModal(false)
        if (resolvedSlug) fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update')
      }
    } catch {
      error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contentForm.title.trim() || !contentForm.content.trim() || !resolvedSlug) return
    setCreatingContent(true)
    try {
      const res = await fetch(`/api/school/${resolvedSlug}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contentForm, hashtags: contentHashtags })
      })
      if (res.ok) {
        success('Content published!')
        setShowContentForm(false)
        setContentForm({ title: '', content: '', contentType: 'article', price: '', isPaid: false })
        setContentHashtags([])
        if (resolvedSlug) fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create content')
      }
    } catch {
      error('Failed to create content')
    } finally {
      setCreatingContent(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim()) return
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
        if (resolvedSlug) fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
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
      if (resolvedSlug) fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
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
        fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className={styles.loading}>Loading school...</div>
  if (!school) return <div className={styles.error}>School not found</div>

  const userClasses = school.user.userClass?.split(',').map(c => c.trim()).filter(Boolean) || []

  return (
    <div className={styles.page}>
      <nav className="breadcrumbs">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/schools" className="breadcrumb-link">Schools</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">{school.schoolName || 'School'}</span>
      </nav>

      <div className={styles.schoolHeader}>
        <div
          className={styles.coverImage}
          style={{ backgroundImage: school.schoolCoverImage ? `url(${school.schoolCoverImage})` : undefined, backgroundSize: school.schoolCoverStyle === 'contain' ? 'contain' : school.schoolCoverStyle === 'fill' ? '100% 100%' : school.schoolCoverStyle === 'repeat' ? 'auto' : 'cover', backgroundRepeat: school.schoolCoverStyle === 'repeat' ? 'repeat' : 'no-repeat', backgroundPosition: 'center' }}
        >
          {!school.schoolCoverImage && <div className={styles.coverGradient} />}
        </div>
        <div className={styles.headerContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {school.schoolImage ? (
                <img src={school.schoolImage} alt={school.schoolName || 'School'} />
              ) : (
                <span>🎓</span>
              )}
            </div>
          </div>
          <div className={styles.schoolInfo}>
            <div className={styles.nameRow}>
              <h1>{school.schoolName || 'Untitled School'}</h1>
              <RoleBadge role={school.user.role} />
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
              {school.user.location && (
                <span className={styles.metaItem}><span>📍</span> {school.user.location}</span>
              )}
              {school.user.website && (
                <a href={school.user.website.startsWith('http') ? school.user.website : `https://${school.user.website}`} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
                  <span>🔗</span> {school.user.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className={styles.metaItem}><span>📅</span> Joined {new Date(school.user.createdAt).toLocaleDateString()}</span>
            </div>
            {(school.links && school.links.length > 0) && (
              <div className={styles.compactLinks}>
                {school.links.slice(0, 6).map(link => <LinkCard key={link.id} link={link} />)}
                {school.links.length > 6 && <span className={styles.compactMore}>+{school.links.length - 6} more</span>}
              </div>
            )}
            {school.donationAddresses.length > 0 && (
              <div className={styles.compactDonations}>
                {school.donationAddresses.slice(0, 2).map(da => <CompactDonation key={da.id} donation={da} />)}
                {school.donationAddresses.length > 2 && (
                  <button className={styles.compactDonationMore} onClick={() => setActiveTab('about')}>
                    +{school.donationAddresses.length - 2} more
                  </button>
                )}
              </div>
            )}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{school.contentCount}</span>
                <span className={styles.statLabel}>Content</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{school.ratingCount}</span>
                <span className={styles.statLabel}>Reviews</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{school.avgRating > 0 ? school.avgRating.toFixed(1) : '—'}</span>
                <span className={styles.statLabel}>Rating</span>
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <Link href={getUserProfileUrl(school.user)} className={styles.viewOwnerBtn}>View Instructor</Link>
            <button onClick={() => setShowAppointmentModal(true)} className={styles.viewOwnerBtn} style={{ fontSize: '0.8rem' }}>📅 Book</button>
            {school.schoolSlug && <button onClick={() => setShowShareModal(true)} className={styles.viewOwnerBtn}>🔗 Share</button>}
            {isOwner && (
              <button onClick={() => { setShowEditModal(true); setActiveTab('about'); }} className={styles.editBtn}>Edit School</button>
            )}
          </div>
        </div>
      </div>

      {school.schoolAbout && (
        <div className={styles.aboutPreview}><p>{school.schoolAbout}</p></div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'content' ? styles.active : ''}`} onClick={() => setActiveTab('content')}>
          Content ({school.schoolContents.length})
        </button>
        <button className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`} onClick={() => setActiveTab('posts')}>
          Posts ({school.posts.length})
        </button>
        <button className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`} onClick={() => setActiveTab('reviews')}>
          Reviews
        </button>
        <button className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`} onClick={() => setActiveTab('about')}>
          About
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'content' && (
          <div className={styles.contentSection}>
            {isOwner && (
              <div className={styles.contentActions}>
                <button onClick={() => setShowContentForm(!showContentForm)} className={styles.addContentBtn}>
                  + Add Content
                </button>
              </div>
            )}
            {showContentForm && isOwner && (
              <form onSubmit={handleCreateContent} className={styles.contentForm}>
                <div className={styles.formGroup}>
                  <label>Title</label>
                  <input type="text" value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Type</label>
                  <select value={contentForm.contentType} onChange={e => setContentForm({ ...contentForm, contentType: e.target.value })}>
                    <option value="article">Article</option>
                    <option value="lesson">Lesson</option>
                    <option value="note">Note</option>
                    <option value="guide">Guide</option>
                    <option value="course">Course</option>
                    <option value="resource">Resource</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Content</label>
                  <textarea value={contentForm.content} onChange={e => setContentForm({ ...contentForm, content: e.target.value })} rows={6} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Hashtags</label>
                  <HashtagInput value={contentHashtags} onChange={setContentHashtags} placeholder="Add hashtags or type # in content..." />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={contentForm.isPaid} onChange={e => setContentForm({ ...contentForm, isPaid: e.target.checked })} />
                    Paid Content
                  </label>
                  {contentForm.isPaid && (
                    <input type="number" value={contentForm.price} onChange={e => setContentForm({ ...contentForm, price: e.target.value })} placeholder="Price ($)" step="0.01" className={styles.priceInput} />
                  )}
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className="btn-primary" disabled={creatingContent}>{creatingContent ? 'Publishing...' : 'Publish'}</button>
                  <button type="button" className="btn-ghost" onClick={() => setShowContentForm(false)}>Cancel</button>
                </div>
              </form>
            )}
            {school.schoolContents.length > 0 ? (
              <div className={styles.contentList}>
                {school.schoolContents.map(item => (
                  <div key={item.id} className={`${styles.contentCard} ${item.pinned ? styles.pinnedCard : ''}`}>
                    <div className={styles.contentCardTop}>
                      <span className={styles.contentTypeIcon}>{CONTENT_TYPE_ICONS[item.contentType] || '📄'}</span>
                      <span className={`badge badge-${item.isPaid ? 'active' : 'draft'}`}>
                        {item.isPaid ? `$${item.price || 0}` : 'Free'}
                      </span>
                      {item.pinned && <span className={styles.pinnedBadge}>📌</span>}
                      {isOwner && (
                        <button
                          onClick={() => handlePin('schoolContent', item.id, item.pinned)}
                          className={styles.pinBtn}
                          title={item.pinned ? 'Unpin' : 'Pin to top'}
                        >
                          {item.pinned ? '📌' : '📍'}
                        </button>
                      )}
                    </div>
                    <h3 onClick={() => setSelectedContent(selectedContent?.id === item.id ? null : item)}>{item.title}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShareContent(item) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 8px', borderRadius: 4, color: 'var(--text-secondary)', transition: 'all 0.15s' }}
                      title="Share to Feed"
                    >
                      🔗
                    </button>
                    {selectedContent?.id === item.id && (
                      <div className={styles.contentBody}>
                        {item.content.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                        <div className={styles.contentMeta}>
                          <span>by {item.user?.name || 'Unknown'}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                    <p className={styles.contentPreview}>{item.content.slice(0, 120)}...</p>
                    {item.hashtags && item.hashtags.length > 0 && (
                      <div className={styles.hashtagRow}>
                        {item.hashtags.map((h: any) => (
                          <Link key={h.id} href={`/hashtag/${h.tag}`} className={styles.hashtagPill} onClick={(e) => e.stopPropagation()}>
                            #{h.tag}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}><p>No content published yet</p></div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className={styles.postsSection}>
            {isOwner && (
              <form onSubmit={handleCreatePost} className={styles.createPost}>
                <MentionInput value={newPost} onChange={setNewPost} placeholder="Share an announcement..." className={styles.postInput} rows={3} />
                <ImageUploader images={newPostImages} onChange={setNewPostImages} maxImages={6} />
                <div className={styles.postActions}>
                  <span className={styles.charCount}>{newPost.length}/2000</span>
                  <button type="submit" disabled={posting || !newPost.trim()} className={styles.postBtn}>{posting ? 'Posting...' : 'Post'}</button>
                </div>
              </form>
            )}
            {school.posts.length > 0 ? (
              <div className={styles.postsList}>
                {school.posts.map(post => (
                  <div key={post.id} className={`${styles.postCard} ${post.pinned ? styles.pinnedCard : ''}`}>
                    <div className={styles.postHeader}>
                      <div className={styles.postAuthor}>
                        <div className={styles.postAvatarSmall}>
                          {post.user.image ? <img src={post.user.image} alt="" /> : <span>{post.user.name?.[0] || 'U'}</span>}
                        </div>
                        <div>
                          <span className={styles.postAuthorName}>{post.user.name || 'School'}</span>
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
            <Rating userId={school.user.id} type="SELLER" />
          </div>
        )}

        {activeTab === 'about' && (
          <div className={styles.aboutSection}>
            {isOwner && showEditModal ? (
              <form onSubmit={handleSaveSchool} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>School Name</label>
                  <input type="text" value={editForm.schoolName} onChange={e => setEditForm({ ...editForm, schoolName: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>About</label>
                  <textarea value={editForm.schoolAbout} onChange={e => setEditForm({ ...editForm, schoolAbout: e.target.value })} rows={4} />
                </div>
                <div className={styles.formGroup}>
                  <label>School Logo</label>
                  <ImageUploader images={editForm.schoolImage ? [editForm.schoolImage] : []} onChange={urls => setEditForm({ ...editForm, schoolImage: urls[0] || '' })} maxImages={1} />
                </div>
                <div className={styles.formGroup}>
                  <label>Cover Image</label>
                  <ImageUploader images={editForm.schoolCoverImage ? [editForm.schoolCoverImage] : []} onChange={urls => setEditForm({ ...editForm, schoolCoverImage: urls[0] || '' })} maxImages={1} />
                </div>
                {editForm.schoolCoverImage && (
                  <div className={styles.formGroup}>
                    <label>Cover Style</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['cover', 'contain', 'fill', 'repeat'].map(s => (
                        <button key={s} type="button" onClick={() => setEditForm(prev => ({ ...prev, schoolCoverStyle: s }))} style={{
                          padding: '6px 14px', borderRadius: 6, border: `1px solid ${editForm.schoolCoverStyle === s ? 'var(--accent-primary)' : 'var(--border-color)'}`, background: editForm.schoolCoverStyle === s ? 'var(--accent-primary)' : 'transparent', color: editForm.schoolCoverStyle === s ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize'
                        }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className={styles.formActions}>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  <button type="button" className="btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                {school.schoolAbout && (
                  <div className={styles.aboutBlock}>
                    <h3>About This School</h3>
                    <p>{school.schoolAbout}</p>
                  </div>
                )}
                <div className={styles.aboutBlock}>
                  <h3>Instructor</h3>
                  <Link href={getUserProfileUrl(school.user)} className={styles.ownerLink}>{school.user.name || 'Anonymous'}</Link>
                  {school.user.location && <p className={styles.ownerMeta}>📍 {school.user.location}</p>}
                  <p className={styles.ownerMeta}>Member since {new Date(school.user.createdAt).toLocaleDateString()}</p>
                </div>
                {school.donationAddresses.length > 0 && (
                  <div className={styles.aboutBlock}>
                    <h3>Support This School</h3>
                    <div className={styles.donationsList}>
                      {school.donationAddresses.map(da => (
                        <div key={da.id} className={styles.donationCardFull}>
                          <div className={styles.donationInfo}>
                            <img src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`} alt="" width={24} height={24} />
                            <div>
                              <div className={styles.donationLabel}>{da.label || da.currency}</div>
                              <code className={styles.donationAddress} title={da.address}>{da.address.length > 20 ? da.address.slice(0, 10) + '...' + da.address.slice(-8) : da.address}</code>
                            </div>
                          </div>
                          <DonationActions address={da.address} size="md" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      <BookAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        sellerId={school.user.id}
        sellerName={school.user.name}
      />

      <ShareToPostModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        referenceType="SCHOOL"
        referenceId={school.schoolSlug || ''}
        referenceTitle={school.schoolName || 'School'}
        referenceImage={school.schoolImage}
      />

      <ShareToPostModal
        isOpen={shareContent !== null}
        onClose={() => setShareContent(null)}
        referenceType="SCHOOLCONTENT"
        referenceId={shareContent?.id || ''}
        referenceTitle={shareContent?.title || ''}
      />
      </div>
    </div>
  )
}
