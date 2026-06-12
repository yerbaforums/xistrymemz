'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import ImageUploader from '@/components/ImageUploader'
import MentionInput from '@/components/MentionInput'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import ShareBar from '@/components/ShareBar'
import StudentList from '@/components/StudentList'
import EntityActions from '@/components/EntityActions'
import HashtagInput from '@/components/HashtagInput'
import RichEditor from '@/components/RichEditor'
import { CONTENT_TEMPLATES } from '@/lib/content-templates'
import { CRYPTO_LOGOS } from '@/lib/constants'
import RoleBadge from '@/components/RoleBadge'
import Rating from '@/components/Rating'
import Loading from '@/components/Loading'
import HashtagText from '@/components/HashtagText'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import LinkPreview from '@/components/LinkPreview'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/Breadcrumbs'

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
  images: string | null
  videoUrl: string | null
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
  const router = useRouter()
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'courses' | 'posts' | 'reviews' | 'about' | 'students'>('content')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ schoolName: '', schoolAbout: '', schoolImage: '', schoolCoverImage: '', schoolCoverStyle: 'cover' })
  const [saving, setSaving] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [showContentForm, setShowContentForm] = useState(false)
  const [courses, setCourses] = useState<Array<{id: string; title: string; description: string | null; difficulty: string; contents: Array<{id: string; contentId: string; sortOrder: number; content: {id: string; title: string; contentType: string}}>; _count: {contents: number}}>>([])
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courseForm, setCourseForm] = useState({title: '', description: '', difficulty: 'beginner'})
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [contentForm, setContentForm] = useState({ title: '', content: '', contentType: 'article', price: '', isPaid: false, images: [] as string[], videoUrl: '', section: '', sortOrder: 0 })
  const [contentHashtags, setContentHashtags] = useState<string[]>([])
  const [creatingContent, setCreatingContent] = useState(false)
  const [editingContentId, setEditingContentId] = useState<string | null>(null)
  const [contentFilter, setContentFilter] = useState<string>('all')
  const [deletingContent, setDeletingContent] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [enrolling, setEnrolling] = useState(false)
  const [myProgress, setMyProgress] = useState<any>(null)
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

  const fetchCourses = async () => {
    if (!resolvedSlug) return
    try {
      const res = await fetch(`/api/school/courses?schoolId=${userId}`)
      if (res.ok) { const data = await res.json(); if (data?.courses) setCourses(data.courses) }
    } catch {}
  }

  const handleEnroll = async () => {
    if (enrolling) return
    setEnrolling(true)
    try {
      if (enrolled) {
        const res = await fetch('/api/school/enroll', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId: userId }) })
        if (res.ok) setEnrolled(false)
      } else {
        const res = await fetch('/api/school/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId: userId }) })
        if (res.ok) setEnrolled(true)
      }
    } catch {}
    setEnrolling(false)
  }

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contentForm.title.trim() || !contentForm.content.trim() || !resolvedSlug) return
    setCreatingContent(true)
    try {
      const isEdit = editingContentId !== null
      const url = isEdit ? `/api/school/${resolvedSlug}/content/${editingContentId}` : `/api/school/${resolvedSlug}/content`
      const method = isEdit ? 'PUT' : 'POST'
      const body = {
        ...contentForm,
        images: contentForm.images.length > 0 ? JSON.stringify(contentForm.images) : null,
        videoUrl: contentForm.videoUrl || null,
        hashtags: contentHashtags
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        success(isEdit ? 'Content updated!' : 'Content published!')
        setShowContentForm(false)
        setEditingContentId(null)
        setContentForm({ title: '', content: '', contentType: 'article', price: '', isPaid: false, images: [], videoUrl: '', section: '', sortOrder: 0 })
        setContentHashtags([])
        if (resolvedSlug) fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
      } else {
        const err = await res.json()
        error(err.error || `Failed to ${isEdit ? 'update' : 'create'} content`)
      }
    } catch {
      error('Failed to save content')
    } finally {
      setCreatingContent(false)
    }
  }

  const handleEditContent = (item: SchoolContent) => {
    setContentForm({
      title: item.title,
      content: item.content,
      contentType: item.contentType,
      price: item.price?.toString() || '',
      isPaid: item.isPaid,
      images: item.images ? JSON.parse(item.images) : [],
      videoUrl: item.videoUrl || '',
      section: (item as any).contentSection || '',
      sortOrder: (item as any).sortOrder || 0
    })
    setContentHashtags(item.hashtags?.map((h: any) => h.tag || h.hashtag?.tag).filter(Boolean) || [])
    setEditingContentId(item.id)
    setShowContentForm(true)
  }

  const handleDeleteContent = async (id: string) => {
    if (!resolvedSlug) return
    try {
      const res = await fetch(`/api/school/${resolvedSlug}/content/${id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Content deleted')
        setDeletingContent(null)
        if (resolvedSlug) fetch(`/api/school/${resolvedSlug}`).then(r => r.json()).then(data => setSchool(data))
      } else {
        const err = await res.json()
        error(err.error || 'Failed to delete')
      }
    } catch {
      error('Failed to delete')
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

  if (loading) return <Loading size="medium" />
  if (!school) return <div className={styles.error}>School not found</div>

  const userClasses = school.user.userClass?.split(',').map(c => c.trim()).filter(Boolean) || []

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Schools', href: '/schools' },
        { label: school.schoolName || 'School' },
      ]} />

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
            {session?.user && session.user.id !== userId && (
              <button onClick={handleEnroll} disabled={enrolling} className={styles.enrollBtn}>
                {enrolling ? '...' : enrolled ? '✅ Enrolled' : '📝 Enroll'}
              </button>
            )}
            {isOwner && (
              <button onClick={() => { setShowEditModal(true); setActiveTab('about'); }} className={styles.editBtn}>Edit School</button>
            )}
          </div>
        </div>
      </div>

      {activeTab !== 'about' && school.schoolAbout && (
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
        {activeTab === 'courses' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>🗂️ Courses</h2>
              {isOwner && (
                <button onClick={() => { setCourseForm({title: '', description: '', difficulty: 'beginner'}); setEditingCourseId(null); setShowCourseForm(true) }} className="btn-primary">+ New Course</button>
              )}
            </div>
            {courses.length === 0 ? (
              <p className={styles.empty}>No courses yet. {isOwner ? 'Create your first course to organize content.' : ''}</p>
            ) : (
              <div className={styles.courseGrid}>
                {courses.map(course => (
                  <div key={course.id} className={styles.courseCard}>
                    <div className={styles.courseHeader}>
                      <h3>{course.title}</h3>
                      <span className={styles.difficulty}>{course.difficulty}</span>
                    </div>
                    {course.description && <p>{course.description}</p>}
                    <div className={styles.courseMeta}>
                      <span>{course._count.contents} lessons</span>
                    </div>
                    {course.contents.map(cc => (
                      <div key={cc.id} className={styles.courseContentItem}>
                        <span>{cc.content.title}</span>
                        <span className={styles.contentType}>{cc.content.contentType}</span>
                      </div>
                    ))}
                    {isOwner && (
                      <div className={styles.courseActions}>
                        <button onClick={() => { setCourseForm({title: course.title, description: course.description || '', difficulty: course.difficulty}); setEditingCourseId(course.id); setShowCourseForm(true) }} className={styles.editBtn}>✏️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
                {!contentForm.content && (() => {
                  const templates = CONTENT_TEMPLATES.filter(t => t.contentType === contentForm.contentType)
                  if (templates.length === 0) return null
                  return (
                    <div className={styles.formGroup}>
                      <label>Starter Templates</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {templates.map(t => (
                          <button key={t.id} type="button" onClick={() => setContentForm({ ...contentForm, content: t.starterContent })}
                            style={{ padding: '8px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)' }}>
                            <span>{t.icon}</span> {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <div className={styles.formGroup}>
                  <label>Content</label>
                  <RichEditor value={contentForm.content} onChange={(html) => setContentForm({ ...contentForm, content: html })} placeholder="Start writing..." />
                </div>
                <div className={styles.formGroup}>
                  <label>Images Gallery</label>
                  <ImageUploader images={contentForm.images} onChange={(urls) => setContentForm({ ...contentForm, images: urls })} maxImages={5} />
                </div>
                <div className={styles.formGroup}>
                  <label>Video URL (optional)</label>
                  <input type="url" value={contentForm.videoUrl} onChange={e => setContentForm({ ...contentForm, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Course Section (optional)</label>
                    <input type="text" value={contentForm.section} onChange={e => setContentForm({ ...contentForm, section: e.target.value })} placeholder="e.g. Module 1: Basics" />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Sort Order</label>
                    <input type="number" value={contentForm.sortOrder} onChange={e => setContentForm({ ...contentForm, sortOrder: parseInt(e.target.value) || 0 })} placeholder="0" />
                  </div>
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
                {contentForm.contentType === 'quiz' && (
                  <div className={styles.formGroup}>
                    <label>Quiz Questions (one per line: Question|Option1|Option2|Option3|Option4|CorrectAnswer)</label>
                    <textarea
                      value={contentForm.content}
                      onChange={e => setContentForm({ ...contentForm, content: e.target.value })}
                      rows={6}
                      placeholder="What is 2+2?|3|4|5|6|4&#10;What color is the sky?|Red|Blue|Green|Yellow|Blue"
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Format: Question|Option1|Option2|Option3|Option4|CorrectAnswer (one per line)</p>
                  </div>
                )}
                <div className={styles.formActions}>
                  <Button type="submit" variant="primary" disabled={creatingContent}>{creatingContent ? 'Saving...' : (editingContentId ? 'Update' : 'Publish')}</Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowContentForm(false); setEditingContentId(null); setContentForm({ title: '', content: '', contentType: 'article', price: '', isPaid: false, images: [], videoUrl: '', section: '', sortOrder: 0 }); setContentHashtags([]) }}>Cancel</Button>
                </div>
              </form>
            )}
            {school.schoolContents.length > 0 && (
              <div className={styles.filterRow}>
                {['all', 'article', 'lesson', 'note', 'guide', 'course', 'resource'].map(type => (
                  <button
                    key={type}
                    className={`${styles.filterBtn} ${contentFilter === type ? styles.filterActive : ''}`}
                    onClick={() => setContentFilter(type)}
                  >
                    {type === 'all' ? 'All' : `${CONTENT_TYPE_ICONS[type] || '📄'} ${type}`}
                  </button>
                ))}
              </div>
            )}
            {school.schoolContents.length > 0 ? (
              <div className={styles.contentList}>
                {(() => {
                  const filtered = school.schoolContents.filter(item => contentFilter === 'all' || item.contentType === contentFilter)
                  const sections = new Map<string, typeof filtered>()
                  const uncategorized: typeof filtered = []
                  for (const item of filtered) {
                    const section = (item as any).contentSection || ''
                    if (section) {
                      if (!sections.has(section)) sections.set(section, [])
                      sections.get(section)!.push(item)
                    } else {
                      uncategorized.push(item)
                    }
                  }
                  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
                  const renderCard = (item: any) => {
                    const itemImages: string[] = item.images ? (() => { try { return JSON.parse(item.images) } catch { return [] } })() : []
                    return (
                    <div key={item.id} className={`${styles.contentCard} ${item.pinned ? styles.pinnedCard : ''}`}>
                      <div className={styles.contentCardTop}>
                        <span className={styles.contentTypeIcon}>{CONTENT_TYPE_ICONS[item.contentType] || '📄'}</span>
                        <span className={`badge badge-${item.isPaid ? 'active' : 'draft'}`}>
                          {item.isPaid ? `$${item.price || 0}` : 'Free'}
                        </span>
                        {item.pinned && <span className={styles.pinnedBadge}>📌</span>}
                        {isOwner && (
                          <button onClick={() => handlePin('schoolContent', item.id, item.pinned)} className={styles.pinBtn} title={item.pinned ? 'Unpin' : 'Pin to top'}>
                            {item.pinned ? '📌' : '📍'}
                          </button>
                        )}
                      </div>
                      {itemImages.length > 0 && (
                        <div className={styles.cardThumb} onClick={() => router.push(`/school/${resolvedSlug}/content/${item.id}`)} style={{cursor: 'pointer'}}>
                          <img src={itemImages[0]} alt="" />
                        </div>
                      )}
                      <h3 onClick={() => router.push(`/school/${resolvedSlug}/content/${item.id}`)} style={{cursor: 'pointer'}}>{item.title}</h3>
                      <p className={styles.contentPreview}>{stripHtml(item.content).slice(0, 120)}...</p>
                      <span className={styles.readTime}>{Math.max(1, Math.round(stripHtml(item.content).split(/\s+/).length / 200))} min read</span>
                      {isOwner && (
                        <div className={styles.ownerActions}>
                          <button onClick={() => handleEditContent(item)} className={styles.editContentBtn}>✏️ Edit</button>
                          <button onClick={() => setDeletingContent(item.id)} className={styles.deleteContentBtn}>🗑️ Delete</button>
                        </div>
                      )}
                      <EntityActions entityType="SCHOOLCONTENT" entityId={item.id} title={item.title} authorId={school.user.id} variant="bar" />
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
                  )}
                  return (
                    <>
                      {uncategorized.map(renderCard)}
                      {[...sections.entries()].map(([sectionName, items]) => (
                        <div key={sectionName} className={styles.sectionGroup}>
                          <h3 className={styles.sectionTitle}>{sectionName}</h3>
                          {items.map(renderCard)}
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            ) : (
              <EmptyState icon="📚" title="No content published yet" description="The instructor hasn't published any content yet." action={isOwner ? { label: 'Add Content', onClick: () => setShowContentForm(true) } : undefined} />
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
                    <p className={styles.postContent}><HashtagText text={post.content} mentionLinks /></p>
                    <LinkPreview text={post.content} />
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
              <EmptyState icon="✏️" title="No posts yet" description="No announcements have been made yet." />
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className={styles.reviewsSection}>
            <Rating userId={school.user.id} type="SELLER" />
          </div>
        )}

        {activeTab === 'students' && isOwner && (
          <StudentList resolvedSlug={resolvedSlug} userId={userId} />
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
                  <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
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

      {showCourseForm && (
        <div className="modal-overlay" onClick={() => setShowCourseForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingCourseId ? 'Edit Course' : 'New Course'}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!courseForm.title.trim()) return
              try {
                const url = editingCourseId ? `/api/school/courses/${editingCourseId}` : '/api/school/courses'
                const method = editingCourseId ? 'PUT' : 'POST'
                const res = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...courseForm, schoolId: userId })
                })
                if (res.ok) { setShowCourseForm(false); fetchCourses() }
              } catch {}
            }}>
              <div className="form-group">
                <label>Course Title</label>
                <input type="text" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} rows={3} />
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select value={courseForm.difficulty} onChange={e => setCourseForm({...courseForm, difficulty: e.target.value})}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCourseForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">{editingCourseId ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
            <ConfirmDialog
        isOpen={deletingContent !== null}
        onClose={() => setDeletingContent(null)}
        onConfirm={() => { if (deletingContent) handleDeleteContent(deletingContent) }}
        title="Delete Content"
        message="Delete this content item? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <LinkedItemsSection
        entityType="SCHOOL"
        entityId={school.user.id}
        currentUserId={session?.user?.id}
      />

      </div>
    </div>
  )
}
