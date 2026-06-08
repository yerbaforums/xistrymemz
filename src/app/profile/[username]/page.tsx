'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './profile.module.css'
import Rating from '@/components/Rating'
import { getUserProfileUrl } from '@/lib/utils'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS } from '@/lib/constants'
import { USER_CLASSES, CLASS_ICONS, matchesClass } from '@/lib/user-classes'
import RoleBadge from '@/components/RoleBadge'
import ActiveStatus from '@/components/ActiveStatus'
import LookingForCollaboratorsBadge from '@/components/LookingForCollaboratorsBadge'
import HashtagText from '@/components/HashtagText'
import LinkPreview from '@/components/LinkPreview'
import MentionInput from '@/components/MentionInput'
import ImageUploader from '@/components/ImageUploader'
import EntityActions from '@/components/EntityActions'
import SharedItemCard from '@/components/SharedItemCard'
import ReplySection from '@/components/ReplySection'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'
import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

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
}

interface UserLocation {
  id: string
  name: string
  location: string
  latitude: number | null
  longitude: number | null
  isPrimary: boolean
}

interface ProfileUser {
  id: string
  name: string | null
  username: string | null
  image: string | null
  coverImage: string | null
  coverStyle?: string
  bio: string | null
  location: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  searchRadius: number
  website: string | null
  userClass: string | null
  role: string
  shopName: string | null
  shopSlug: string | null
  schoolName: string | null
  schoolSlug: string | null
  createdAt: string
  earthId: string | null
  traveling: boolean
  verificationLevel: string
  reputationScore: number
  verifiedEmail: boolean
  verifiedPhone: boolean
  verifiedIdentity: boolean
  verifiedAddress: boolean
  planCount: number
  postCount: number
  productCount: number
  connectionCount: number
  inviteCount: number
  isConnected: boolean
  hasPendingRequest: boolean
  connectionId: string | null
  acceptsDonations: boolean
  donationAddress: string | null
  donationCurrency: string | null
  donationAddresses: DonationAddr[]
  links?: UserLink[]
  userLocations?: UserLocation[]
  volunteerCount?: number
  eventCount?: number
  forumPostCount?: number
  forumReplyCount?: number
  badgeCount?: number
  dealsCount?: number
  requestCount?: number
  groupCount?: number
  badges?: Badge[]
  lookingForCollaborators?: boolean
  lastActiveAt?: string | null
}

interface Badge {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  tier: string
}

interface Post {
  id: string
  content: string
  imageUrl: string | null
  images: string | null
  pinned: boolean
  userId: string
  targetUserId: string | null
  likes: number
  createdAt: string
  context?: string | null
  referenceType?: string | null
  referenceId?: string | null
  referenceTitle?: string | null
  repostCount?: number
  reposted?: boolean
  user: {
    id: string
    name: string | null
    image: string | null
    username?: string | null
    shopSlug: string | null
  }
}

interface Plan {
  id: string
  title: string
  description: string | null
  status: string
  published: boolean
  pinned: boolean
  createdAt: string
}

interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  imageUrl: string | null
  type: string
  pinned: boolean
  createdAt: string
}

interface Connection {
  id: string
  name: string | null
  username: string | null
  image: string | null
  userClass: string | null
  shopSlug: string | null
}

interface UserGroup {
  id: string
  name: string
  description: string | null
  image: string | null
  imageUrl: string | null
  memberCount: number
  role: string
  joinedAt: string
}

interface ForumPostEntry {
  id: string
  title: string
  content: string
  category: { name: string; slug: string }
  replyCount: number
  createdAt: string
}

interface UserEventEntry {
  id: string
  title: string
  description: string | null
  eventCategory: string | null
  eventDate: string | null
  location: string | null
  userName: string | null
  _count: { eventJoiners: number }
}

interface UserRequestEntry {
  id: string
  title: string
  description: string | null
  status: string
  category: string | null
  createdAt: string
}

function DonationCard({ donation }: { donation: DonationAddr }) {
  const [qrOpen, setQrOpen] = useState(false)
  const shortAddr = donation.address.length > 12
    ? donation.address.slice(0, 6) + '...' + donation.address.slice(-4)
    : donation.address

  return (
    <>
      <div className={styles.donationCard}>
        <div className={styles.donationInfo}>
          <img src={`/crypto-logos/${CRYPTO_LOGOS[donation.currency] || 'ethereum.png'}`} alt="" width={24} height={24} />
          <div>
            <div className={styles.donationLabel}>
              {donation.label || donation.currency}
            </div>
            <code className={styles.donationAddress} title={donation.address}>{shortAddr}</code>
          </div>
        </div>
        <DonationActions address={donation.address} onQrClick={() => setQrOpen(true)} size="md" />
      </div>
      {qrOpen && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrOpen(false)}
          currency={donation.label || donation.currency}
          address={donation.address}
        />
      )}
    </>
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
        <img src={`/crypto-logos/${CRYPTO_LOGOS[donation.currency] || 'ethereum.png'}`} alt="" width={16} height={16} />
        <span className={styles.compactDonationLabel}>{donation.label || donation.currency}</span>
        <code className={styles.compactDonationAddr} title={donation.address}>{shortAddr}</code>
      </div>
      {qrOpen && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrOpen(false)}
          currency={donation.label || donation.currency}
          address={donation.address}
        />
      )}
    </>
  )
}

function LinkCard({ link, styles }: { link: UserLink; styles: Record<string, string> }) {
  const socialType = ['twitter', 'github', 'instagram', 'linkedin', 'youtube', 'tiktok', 'discord', 'telegram'].includes(link.type)
    ? link.type
    : 'website'
  const iconMap: Record<string, string> = {
    twitter: '/social-logos/twitter.svg',
    github: '/social-logos/github.svg',
    instagram: '/social-logos/instagram.svg',
    linkedin: '/social-logos/linkedin.svg',
    youtube: '/social-logos/youtube.svg',
    tiktok: '/social-logos/tiktok.svg',
    discord: '/social-logos/discord.svg',
    telegram: '/social-logos/telegram.svg',
    website: '🔗'
  }
  const iconSrc = link.icon || iconMap[socialType]

  return (
    <div className={styles.linkPillContainer}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.linkPill}
      >
        {iconSrc.startsWith('/') ? (
          <img src={iconSrc} alt={link.label || link.type} width={16} height={16} />
        ) : (
          <span>{iconSrc}</span>
        )}
        <span>{link.label || link.type}</span>
      </a>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [donationAddresses, setDonationAddresses] = useState<DonationAddr[]>([])
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [postsOffset, setPostsOffset] = useState(0)
  const [totalPostCount, setTotalPostCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'plans' | 'connections' | 'groups' | 'forum' | 'events' | 'requests' | 'shop' | 'school' | 'reviews' | 'about'>('posts')
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [forumPosts, setForumPosts] = useState<ForumPostEntry[]>([])
  const [userEvents, setUserEvents] = useState<UserEventEntry[]>([])
  const [userRequests, setUserRequests] = useState<UserRequestEntry[]>([])
  const [loadingForum, setLoadingForum] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    image: '',
    coverImage: '',
    coverStyle: '',
    userClass: ''
  })
  const [newPost, setNewPost] = useState('')
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectMessage, setConnectMessage] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [confirmDeletePost, setConfirmDeletePost] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const { error: toastError, success: toastSuccess } = useToast()

  const getPostImages = (images: string | null): string[] => {
    if (!images) return []
    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const getTargetId = () => {
    if (params.username) {
      return Array.isArray(params.username) ? params.username[0] : params.username
    }
    return session?.user?.id || ''
  }

  useEffect(() => {
    const targetId = getTargetId()
    if (targetId) {
      fetchProfile(targetId)
    }
  }, [status, params.username])

  const fetchProfile = async (targetId: string) => {
    try {
      const res = await fetch(`/api/users/${targetId}`)
      if (!res.ok) throw new Error('Failed to fetch profile')
      const data = await res.json()
      setUser(data.user)
      setIsOwnProfile(session?.user ? (data.user.id === session.user.id) : false)
      setPosts(data.posts || [])
      setPlans(data.plans || [])
      setProducts(data.products || [])
      setConnections(data.connections || [])
      setGroups(data.groups || [])
      setDonationAddresses(data.user.donationAddresses || [])
      setTotalPostCount(data.totalPostCount ?? data.posts?.length ?? 0)
      setHasMorePosts((data.totalPostCount ?? 0) > (data.posts?.length ?? 0))
      setEditForm({
        name: data.user.name || '',
        username: data.user.username || '',
        bio: data.user.bio || '',
        location: data.user.location || '',
        website: data.user.website || '',
        image: data.user.image || '',
        coverImage: data.user.coverImage || '',
        coverStyle: data.user.coverStyle || 'cover',
        userClass: data.user.userClass || ''
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch forum posts when tab is active
  useEffect(() => {
    if (activeTab !== 'forum' || !user) return
    const fetchForumPosts = async () => {
      setLoadingForum(true)
      try {
        const res = await fetch(`/api/forum/posts?authorId=${user.id}&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setForumPosts(data || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingForum(false)
      }
    }
    fetchForumPosts()
  }, [activeTab, user?.id])

  // Fetch events when tab is active
  useEffect(() => {
    if (activeTab !== 'events' || !user) return
    const fetchEvents = async () => {
      setLoadingEvents(true)
      try {
        const res = await fetch(`/api/events?organizerId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setUserEvents(data || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingEvents(false)
      }
    }
    fetchEvents()
  }, [activeTab, user?.id])

  // Fetch requests when tab is active
  useEffect(() => {
    if (activeTab !== 'requests' || !user) return
    const fetchRequests = async () => {
      setLoadingRequests(true)
      try {
        const res = await fetch(`/api/requests?userId=${user.id}&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setUserRequests(data || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingRequests(false)
      }
    }
    fetchRequests()
  }, [activeTab, user?.id])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!user) return
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setEditMode(false)
        const newUsername = editForm.username?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
        if (newUsername && newUsername !== params.username) {
          router.push(`/profile/${newUsername}`)
        } else {
          fetchProfile(getTargetId())
        }
      } else {
        console.error('Profile update failed:', data.error)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = data.url
      const updateRes = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, image: url })
      })
      if (updateRes.ok) {
        setEditForm(f => ({ ...f, image: url }))
        fetchProfile(getTargetId())
        update()
        toastSuccess('Avatar updated!')
      } else {
        const errData = await updateRes.json().catch(() => ({ error: 'Failed to update profile' }))
        toastError(errData.error || 'Failed to update avatar')
      }
    } catch (err) {
      console.error('Avatar upload failed:', err)
      toastError('Failed to upload avatar. Please try again.')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setCoverUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = data.url
      const updateRes = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, coverImage: url })
      })
      if (updateRes.ok) {
        setEditForm(f => ({ ...f, coverImage: url }))
        fetchProfile(getTargetId())
        toastSuccess('Cover image updated!')
      } else {
        const errData = await updateRes.json().catch(() => ({ error: 'Failed to update profile' }))
        toastError(errData.error || 'Failed to update cover image')
      }
    } catch (err) {
      console.error('Cover upload failed:', err)
      toastError('Failed to upload cover image. Please try again.')
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim() || !user) return

    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPost,
          targetUserId: isOwnProfile ? undefined : user.id,
          images: newPostImages.length > 0 ? newPostImages : undefined
        })
      })

      if (res.ok) {
        setNewPost('')
        setNewPostImages([])
        fetchProfile(getTargetId())
      } else {
        const err = await res.json()
        console.error('Post creation failed:', err.error)
      }
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchProfile(getTargetId())
      } else {
        toastError('Failed to delete post')
      }
    } catch {
      toastError('Failed to delete post')
    }
  }

  const handleToggleLike = (postId: string, liked: boolean) => {
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (liked) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  const handleLoadMorePosts = async () => {
    if (!user) return
    setLoadingMorePosts(true)
    try {
      const newOffset = postsOffset + 20
      const res = await fetch(`/api/posts?targetUserId=${user.id}&limit=20&offset=${newOffset}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(prev => [...prev, ...data.posts])
        setPostsOffset(newOffset)
        setHasMorePosts(newOffset + data.posts.length < (totalPostCount ?? 0))
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setLoadingMorePosts(false)
    }
  }

  const handlePin = async (type: string, id: string, currentPinned: boolean) => {
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, pinned: !currentPinned })
      })
      if (res.ok) {
        fetchProfile(getTargetId())
      }
    } catch (error) {
      console.error('Error pinning item:', error)
    }
  }

  const handleConnect = async () => {
    if (!user) return
    setConnecting(true)
    try {
      const res = await fetch('/api/community/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receiverId: user.id,
          message: connectMessage || undefined
        })
      })
      
      const data = await res.json()
      if (res.ok) {
        setShowConnectModal(false)
        setConnectMessage('')
        fetchProfile(getTargetId())
      } else {
        console.error('Connect error:', data.error)
      }
    } catch (error) {
      console.error('Error connecting:', error)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user || !user.connectionId) return

    try {
      const res = await fetch(`/api/community/connect?connectionId=${user.connectionId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        fetchProfile(getTargetId())
      } else {
        toastError('Failed to disconnect')
      }
    } catch {
      toastError('Failed to disconnect')
    }
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading profile...</div></div>
  }

  if (!user) {
    return <div className={styles.container}><div className={styles.notFound}>User not found</div></div>
  }

  const userClasses = user.userClass ? user.userClass.split(',').map(c => c.trim()).filter(Boolean) : []

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Profile' },
      ]} />
      <div className={styles.profileHeader}>
        <div 
          className={styles.coverImage}
          style={{
            backgroundImage: user.coverImage ? `url(${user.coverImage})` : undefined,
            backgroundSize: user.coverStyle === 'contain' ? 'contain' : user.coverStyle === 'fill' ? '100% 100%' : user.coverStyle === 'repeat' ? 'auto' : 'cover',
            backgroundRepeat: user.coverStyle === 'repeat' ? 'repeat' : 'no-repeat'
          }}
        >
          {!user.coverImage && <div className={styles.coverPlaceholder} />}
          {isOwnProfile && !editMode && (
            <Button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 3, padding: '6px 12px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >
              {coverUploading ? '...' : 'Change Cover'}
            </Button>
          )}
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverUpload} style={{ display: 'none' }} />
        </div>
        
           <div className={styles.profileContent}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar} style={{ cursor: isOwnProfile && !editMode ? 'pointer' : undefined }} onClick={() => { if (isOwnProfile && !editMode) avatarInputRef.current?.click() }}>
                  {user.image ? (
                    <Image src={user.image} alt={user.name || 'User'} fill />
                  ) : (
                    <span>{user.name?.[0] || 'U'}</span>
                  )}
                  {isOwnProfile && !editMode && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', opacity: 0, transition: 'opacity 0.2s', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                      {avatarUploading ? '...' : 'Edit'}
                    </div>
                  )}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                {user.verifiedIdentity && (
                 <div className={styles.verifiedBadge}>
                   <img src="/logo.png" alt="Verified" width={20} height={20} className={styles.logoBadge} />
                 </div>
               )}
             </div>
          
           <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={styles.editInput}
                    placeholder="Display name"
                  />
                ) : (
                  <>
                    <h1>{user.name || 'Anonymous User'}</h1>
                    <RoleBadge role={user.role || 'USER'} />
                    <ActiveStatus lastActiveAt={user.lastActiveAt} showLabel size={8} />
                    {user.lookingForCollaborators && <LookingForCollaboratorsBadge size="md" />}
                  </>
                )}
              </div>
              
              {user.username && (
                <div className={styles.username}>@{user.username}</div>
              )}
             
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
               {user.location && (
                 <span className={styles.metaItem}>
                   <span>📍</span> {user.location}
                 </span>
               )}
               {user.website && (
                 <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
                   <span>🔗</span> {user.website.replace(/^https?:\/\//, '')}
                 </a>
               )}
<span className={styles.metaItem}>
                   <span>📅</span> Joined {new Date(user.createdAt).toLocaleDateString()}
                 </span>
               </div>

              <div className={styles.earthPassport}>
                <div className={styles.passportTopRow}>
                  <span className={styles.passportGlobe}>🌍</span>
                  <span className={styles.passportName}>Earth Passport</span>
                  <span className={`${styles.passportMode} ${user.traveling ? styles.traveling : styles.home}`}>
                    {user.traveling ? 'Traveling' : 'Home'}
                  </span>
                  {(user.verificationLevel && user.verificationLevel !== 'NONE') && (
                    <span className={`${styles.verificationBadge} ${styles[(user.verificationLevel || 'none').toLowerCase()]}`}>
                      {user.verificationLevel}
                    </span>
                  )}
                </div>
                {(user.location || user.neighborhood) && (
                  <div className={styles.passportLocationRow}>
                    <span className={styles.passportLocationIcon}>📍</span>
                    <span className={styles.passportLocation}>
                      {user.location}{user.neighborhood ? `, ${user.neighborhood}` : ''}
                    </span>
                    {user.searchRadius > 0 && (
                      <span className={styles.passportRadius}>📡{user.searchRadius}km</span>
                    )}
                  </div>
                )}
                {user.latitude && user.longitude && (
                  <span className={styles.passportCoords}>
                    {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                  </span>
                )}
                <div className={styles.passportBadges}>
                  {user.reputationScore > 0 && (
                    <div className={styles.repRing} title={`Reputation: ${user.reputationScore.toFixed(0)}`}>
                      <svg width="24" height="24" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3"/>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--accent-primary)" strokeWidth="3"
                          strokeDasharray={`${Math.min(user.reputationScore, 100)} 100`}
                          strokeLinecap="round" transform="rotate(-90 18 18)"/>
                      </svg>
                      <span className={styles.compactRep}>{user.reputationScore.toFixed(0)}</span>
                    </div>
                  )}
                  {(user.volunteerCount ?? 0) > 0 && (
                    <span className={styles.compactVBadge} title={`${user.volunteerCount} volunteer activities`}>🙋V</span>
                  )}
                  {user.verifiedEmail && <span className={styles.compactVBadge} title="Verified email">✓E</span>}
                  {user.verifiedPhone && <span className={styles.compactVBadge} title="Verified phone">✓P</span>}
                  {user.verifiedIdentity && <span className={styles.compactVBadge} title="Verified ID">✓ID</span>}
                  {user.verifiedAddress && <span className={styles.compactVBadge} title="Verified address">✓A</span>}
                </div>
              </div>

              {(user.links && user.links.length > 0) && (
                <div className={styles.compactLinks}>
                  {user.links.slice(0, 6).map((link: UserLink) => (
                    <LinkCard key={link.id} link={link} styles={styles} />
                  ))}
                  {user.links.length > 6 && (
                    <span className={styles.compactMore}>+{user.links.length - 6} more</span>
                  )}
                </div>
              )}

              {user.acceptsDonations && donationAddresses.length > 0 && (
                <div className={styles.compactDonations}>
                  {donationAddresses.slice(0, 2).map(da => (
                    <CompactDonation key={da.id} donation={da} />
                  ))}
                  {donationAddresses.length > 2 && (
                    <Button className={styles.compactDonationMore} onClick={() => setActiveTab('about')}>
                      +{donationAddresses.length - 2} more
                    </Button>
                  )}
                </div>
              )}

              <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.postCount}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.planCount}</span>
                <span className={styles.statLabel}>Projects</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.productCount}</span>
                <span className={styles.statLabel}>Listings</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.connectionCount}</span>
                <span className={styles.statLabel}>Connections</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.inviteCount ?? 0}</span>
                <span className={styles.statLabel}>Invited</span>
              </div>
              {user.volunteerCount !== undefined && user.volunteerCount > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{user.volunteerCount}</span>
                  <span className={styles.statLabel}>Volunteer</span>
                </div>
              )}
              {user.dealsCount !== undefined && user.dealsCount > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{user.dealsCount}</span>
                  <span className={styles.statLabel}>Deals</span>
                </div>
              )}
              {user.eventCount !== undefined && user.eventCount > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{user.eventCount}</span>
                  <span className={styles.statLabel}>Events</span>
                </div>
              )}
              {user.forumPostCount !== undefined && (user.forumPostCount > 0 || (user.forumReplyCount ?? 0) > 0) && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{user.forumPostCount! + (user.forumReplyCount ?? 0)}</span>
                  <span className={styles.statLabel}>Forum</span>
                </div>
              )}
              </div>
              </div>

           
            <div className={styles.actions}>
              {user?.id && <EntityActions entityType="PROFILE" entityId={user.id} title={user.name || 'User'} authorId={user.id} description={user.username || user.name || ''} variant="modal-trigger" triggerClassName={styles.shareBtn} />}
              {isOwnProfile && (
               <Link href="/profile/settings" className={styles.settingsIconBtn} title="Profile Settings">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                 </svg>
               </Link>
             )}
             {isOwnProfile ? (
              editMode ? (
                <>
                  <Button onClick={handleUpdateProfile} className={styles.saveBtn}>Save</Button>
                  <Button onClick={() => setEditMode(false)} className={styles.cancelBtn}>Cancel</Button>
                </>
              ) : (
                <Button onClick={() => { setEditMode(true); setActiveTab('about'); }} className={styles.editBtn}>Edit Profile</Button>
              )
            )             : status === 'authenticated' ? (
              <>
                <Link href={`/messages?user=${user.id}`} className={styles.messageBtn}>Message</Link>
                <Button onClick={() => setShowAppointmentModal(true)} className={styles.messageBtn}>📅 Book</Button>
                <Button
                  onClick={async () => {
                    const res = await fetch('/api/video/rooms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: `Chat with ${user.name || 'User'}` }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      router.push(`/dashboard/video?invite=${data.room.inviteCode}`)
                    }
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                    cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  📹 Video Chat
                </Button>

                {user.isConnected ? (
                  <Button 
                  onClick={() => setConfirmDisconnect(true)}
                  className={styles.disconnectBtn}
                  >
                    Disconnect
                  </Button>
                ) : user.hasPendingRequest ? (
                  <Button 
                    disabled
                    className={`${styles.connectBtn} ${styles.pending}`}
                  >
                    Pending
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowConnectModal(true)}
                    className={styles.connectBtn}
                  >
                    Connect
                  </Button>
                )}
              </>
            ) : (
              <Link href="/auth/login" className={styles.loginToConnect}>Login to Connect</Link>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <Button 
          className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts ({posts.length})
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'plans' ? styles.active : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Projects ({plans.length})
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'connections' ? styles.active : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connections ({connections.length})
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups ({groups.length})
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'forum' ? styles.active : ''}`}
          onClick={() => setActiveTab('forum')}
        >
          Forum {(user.forumPostCount ?? 0) > 0 ? `(${user.forumPostCount! + (user.forumReplyCount ?? 0)})` : ''}
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'events' ? styles.active : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events {(user.eventCount ?? 0) > 0 ? `(${user.eventCount})` : ''}
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests {(user.requestCount ?? 0) > 0 ? `(${user.requestCount})` : ''}
        </Button>
        {products.length > 0 && (
          <Button 
            className={`${styles.tab} ${activeTab === 'shop' ? styles.active : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            Shop ({products.length})
          </Button>
        )}
        {(user.schoolName || user.schoolSlug) && (
          <Button 
            className={`${styles.tab} ${activeTab === 'school' ? styles.active : ''}`}
            onClick={() => setActiveTab('school')}
          >
            School
          </Button>
        )}
        <Button 
          className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </Button>
        <Button 
          className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </Button>
      </div>

      {userClasses.length > 0 && (
        <div className={styles.classTabs}>
          <Button
            className={`${styles.classTab} ${activeClass === null ? styles.classTabActive : ''}`}
            onClick={() => { setActiveClass(null); setActiveTab('posts') }}
          >
            <span className={styles.classIcon}>{CLASS_ICONS['Architect'] || '📋'}</span>
            Combined
          </Button>
          {userClasses.map(cls => (
            <Button
              key={cls}
              className={`${styles.classTab} ${activeClass === cls ? styles.classTabActive : ''}`}
              onClick={() => { setActiveClass(cls); setActiveTab('posts') }}
            >
              <span className={styles.classIcon}>{CLASS_ICONS[cls] || '👤'}</span>
              {cls}
            </Button>
          ))}
        </div>
      )}

      <div className={styles.content}>
        {activeClass !== null && (
          <div className={styles.classContent}>
            <h3 className={styles.classSectionTitle}>
              <span className={styles.classIcon}>{CLASS_ICONS[activeClass] || '👤'}</span>
              {activeClass} Activity
            </h3>
            {posts.filter(p => matchesClass(p.content || '', activeClass)).length > 0 && (
              <div className={styles.classEntitySection}>
                <h4>Posts</h4>
                <div className={styles.classEntityGrid}>
                  {posts.filter(p => matchesClass(p.content || '', activeClass)).slice(0, 6).map(p => (
                    <div key={p.id} className={styles.classEntityCard}>
                      {p.images && <div className={styles.classEntityImage}><Image src={getPostImages(p.images)[0] || ''} alt="" fill style={{objectFit:'cover'}} /></div>}
                      <div className={styles.classEntityBody}>
                        <Link href={`/posts/${p.id}`} className={styles.classEntityLink}>{p.content?.slice(0, 80)}</Link>
                        <span className={styles.classEntityDate}>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plans.filter(p => matchesClass(p.title || '', activeClass)).length > 0 && (
              <div className={styles.classEntitySection}>
                <h4>Projects</h4>
                <div className={styles.classEntityGrid}>
                  {plans.filter(p => matchesClass(p.title || '', activeClass)).slice(0, 6).map(p => (
                    <div key={p.id} className={styles.classEntityCard}>
                      <div className={styles.classEntityBody}>
                        <Link href={`/plans/${p.id}`} className={styles.classEntityLink}>{p.title}</Link>
                        <span className={styles.classEntityBadge}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {products.filter(p => matchesClass(p.title || '', activeClass)).length > 0 && (
              <div className={styles.classEntitySection}>
                <h4>Shop</h4>
                <div className={styles.classEntityGrid}>
                  {products.filter(p => matchesClass(p.title || '', activeClass)).slice(0, 6).map(p => (
                    <div key={p.id} className={styles.classEntityCard}>
                      {p.imageUrl && <div className={styles.classEntityImage}><Image src={p.imageUrl} alt="" fill style={{objectFit:'cover'}} /></div>}
                      <div className={styles.classEntityBody}>
                        <Link href={`/products/${p.id}`} className={styles.classEntityLink}>{p.title}</Link>
                        {p.price && <span className={styles.classEntityPrice}>${p.price}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {userEvents.filter(e => matchesClass(e.title || '', activeClass)).length > 0 && (
              <div className={styles.classEntitySection}>
                <h4>Events</h4>
                <div className={styles.classEntityGrid}>
                  {userEvents.filter(e => matchesClass(e.title || '', activeClass)).slice(0, 6).map(e => (
                    <div key={e.id} className={styles.classEntityCard}>
                      <div className={styles.classEntityBody}>
                        <Link href={`/events/${e.id}`} className={styles.classEntityLink}>{e.title}</Link>
                        <span className={styles.classEntityDate}>{new Date(e.eventDate || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {userClasses.length > 0 && userRequests.filter(r => matchesClass(r.title || '', activeClass) || matchesClass(r.description || '', activeClass)).length > 0 && (
              <div className={styles.classEntitySection}>
                <h4>Requests</h4>
                <div className={styles.classEntityGrid}>
                  {userRequests.filter(r => matchesClass(r.title || '', activeClass) || matchesClass(r.description || '', activeClass)).slice(0, 6).map(r => (
                    <div key={r.id} className={styles.classEntityCard}>
                      <div className={styles.classEntityBody}>
                        <Link href={`/requests/${r.id}`} className={styles.classEntityLink}>{r.title}</Link>
                        <span className={styles.classEntityBadge}>{r.status || 'OPEN'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {groups.filter(g => matchesClass(g.name || '', activeClass) || matchesClass(g.description || '', activeClass)).length > 0 && (
              <div className={styles.classEntitySection}>
                <h4>Groups</h4>
                <div className={styles.classEntityGrid}>
                  {groups.filter(g => matchesClass(g.name || '', activeClass) || matchesClass(g.description || '', activeClass)).slice(0, 6).map(g => (
                    <div key={g.id} className={styles.classEntityCard}>
                      {g.image && <div className={styles.classEntityImage}><Image src={g.image} alt="" fill style={{objectFit:'cover'}} /></div>}
                      <div className={styles.classEntityBody}>
                        <Link href={`/groups/${g.id}`} className={styles.classEntityLink}>{g.name}</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {posts.filter(p => matchesClass(p.content || '', activeClass)).length === 0 &&
             plans.filter(p => matchesClass(p.title || '', activeClass) || matchesClass(p.description || '', activeClass)).length === 0 &&
             products.filter(p => matchesClass(p.title || '', activeClass) || matchesClass(p.description || '', activeClass)).length === 0 &&
             userEvents.filter(e => matchesClass(e.title || '', activeClass) || matchesClass(e.description || '', activeClass)).length === 0 &&
             userRequests.filter(r => matchesClass(r.title || '', activeClass) || matchesClass(r.description || '', activeClass)).length === 0 &&
             groups.filter(g => matchesClass(g.name || '', activeClass) || matchesClass(g.description || '', activeClass)).length === 0 && (
              <EmptyState icon="👤" title={`No ${activeClass} activity found`} description="This user has no activity in this class." />
            )}
          </div>
        )}
        {activeClass === null && activeTab === 'posts' && (
          <div className={styles.postsSection}>
            {status === 'authenticated' && (
              <form onSubmit={handleCreatePost} className={styles.createPost}>
                <div className={styles.postInputWrapper}>
                  <div className={styles.postAvatar}>
                    {session?.user?.image ? (
                      <Image src={session.user.image} alt="" fill />
                    ) : (
                      <span>{session?.user?.name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <MentionInput
                    value={newPost}
                    onChange={setNewPost}
                    placeholder={isOwnProfile ? "What's on your mind?" : `Write on ${user.name || 'this user'}'s wall...`}
                    className={styles.postInput}
                    rows={3}
                  />
                </div>
                <div style={{ marginTop: '8px' }}>
                  <ImageUploader images={newPostImages} onChange={setNewPostImages} />
                </div>
                <div className={styles.formPostActions}>
                  <span className={styles.charCount}>{newPost.length}/2000</span>
                  <Button type="submit" disabled={posting || !newPost.trim()} className={styles.postBtn}>
                    {posting ? 'Posting...' : (isOwnProfile ? 'Post' : 'Post on Wall')}
                  </Button>
                </div>
              </form>
            )}

            {posts.length > 0 ? (
              <>
                <div className={styles.postsList}>
                {[...posts].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((post) => {
                  const isWallPost = post.targetUserId !== undefined && post.targetUserId !== null
                  return (
                    <div key={post.id} className={`${styles.postCard} ${post.pinned ? styles.pinnedCard : ''}`}>
                        <div className={styles.postHeader}>
                          <div className={styles.postAuthor}>
                            <div className={styles.postAvatarSmall}>
                              {post.user.image ? (
                                <Image src={post.user.image} alt="" fill />
                              ) : (
                                <span>{post.user.name?.[0] || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <Link href={getUserProfileUrl(post.user)} className={styles.postAuthorName}>
                                {post.pinned && <span className={styles.pinnedBadge}>📌</span>}
                                {post.user.name || 'Anonymous'}
                              </Link>
                              {isWallPost && <span className={styles.wallPostBadge}> posted on {user.name || 'this user'}'s wall</span>}
                              <span className={styles.postDate}>
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className={styles.cardPostActions}>
                            {isOwnProfile && (
                              <Button 
                                onClick={() => handlePin('post', post.id, post.pinned)} 
                                className={styles.pinBtn}
                                title={post.pinned ? 'Unpin' : 'Pin to top'}
                              >
                                {post.pinned ? '📌' : '📍'}
                              </Button>
                            )}
                            <Button onClick={() => setConfirmDeletePost(post.id)} className={styles.deletePost}>
                              ×
                            </Button>
                          </div>
                        </div>
<p className={styles.postContent}><HashtagText text={post.content} mentionLinks /></p>
                    <LinkPreview text={post.content} />

                        {post.referenceType && post.referenceId && (
                          <SharedItemCard
                            referenceType={post.referenceType}
                            referenceId={post.referenceId}
                            referenceTitle={post.referenceTitle}
                          />
                        )}
                        <div className={styles.postFooter}>
                          <EntityActions
                            entityType="POST"
                            entityId={post.id}
                            title={post.content?.slice(0, 100) || 'Post'}
                            authorId={post.userId}
                            initialLikes={post.likes}
                            liked={likedPosts.has(post.id)}
                            repostCount={post.repostCount || 0}
                            reposted={post.reposted || false}
                            variant="full"
                          />
                          <ReplySection postId={post.id} postAuthorId={post.userId} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {hasMorePosts && (
                  <Button onClick={handleLoadMorePosts} disabled={loadingMorePosts} className={styles.loadMoreBtn}>
                    {loadingMorePosts ? 'Loading...' : `Load more posts (${(totalPostCount ?? 0) - posts.length} remaining)`}
                  </Button>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                <p>No posts yet</p>
              </div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'plans' && (
          <div className={styles.plansSection}>
            {plans.length > 0 ? (
              <div className={styles.plansGrid}>
                {plans.map((plan) => (
                  <div key={plan.id} className={`${styles.planCard} ${plan.pinned ? styles.pinnedCard : ''}`}>
                    {isOwnProfile && (
                      <Button 
                        onClick={() => handlePin('plan', plan.id, plan.pinned)} 
                        className={styles.cardPinBtn}
                        title={plan.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        {plan.pinned ? '📌' : '📍'}
                      </Button>
                    )}
                    <Link href={`/plans/${plan.id}`} className={styles.planCardLink}>
                      <h3>
                        {plan.pinned && <span className={styles.pinnedBadge}>📌</span>}
                        {plan.title}
                      </h3>
                      <span className={`${styles.planStatus} ${styles[(plan.status || '').toLowerCase()]}`}>
                        {plan.status}
                      </span>
                      <p>Created {new Date(plan.createdAt).toLocaleDateString()}</p>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No plans yet</p>
              </div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'connections' && (
          <div className={styles.connectionsSection}>
            {connections.length > 0 ? (
              <div className={styles.connectionsGrid}>
                {connections.map((conn) => (
                  <Link key={conn.id} href={getUserProfileUrl(conn)} className={styles.connectionCard}>
                    <div className={styles.connectionAvatar}>
                      {conn.image ? (
                        <Image src={conn.image} alt={conn.name || 'User'} fill />
                      ) : (
                        <span>{conn.name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <div className={styles.connectionInfo}>
                      <h4>{conn.name || 'Anonymous User'}</h4>
                      {conn.userClass && <p className={styles.connectionClass}>{conn.userClass}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No connections yet</p>
              </div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'groups' && (
          <div className={styles.groupsSection}>
            {groups.length > 0 ? (
              <div className={styles.groupsGrid}>
                {groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
                    <div className={styles.groupIcon}>
                      {group.imageUrl ? (
                        <Image src={group.imageUrl} alt={group.name} fill style={{objectFit: 'cover'}} />
                      ) : (
                        <span>👥</span>
                      )}
                    </div>
                    <div className={styles.groupInfo}>
                      <h4>{group.name}</h4>
                      <p className={styles.groupMeta}>
                        <span>👥 {group.memberCount} members</span>
                        {group.role === 'ADMIN' && <span className={styles.adminBadge}>Admin</span>}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>{isOwnProfile ? "You haven't joined any groups yet." : `${user.name || 'This user'} hasn't joined any groups yet.`}</p>
                {isOwnProfile && (
                  <Link href="/groups" className={styles.browseGroupsLink}>
                    Browse Groups →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'forum' && (
          <div className={styles.forumSection}>
            <h3>Forum Posts</h3>
            {loadingForum ? (
              <div className={styles.empty}><Skeleton width="100%" height="1rem" /></div>
            ) : forumPosts.length > 0 ? (
              <div className={styles.postsList}>
                {forumPosts.map(fp => (
                  <Link key={fp.id} href={`/community/forum/${fp.id}`} className={styles.forumPostCard}>
                    <span className={styles.forumPostCategory}>{fp.category.name}</span>
                    <h4>{fp.title}</h4>
                    <p>{fp.content.length > 120 ? fp.content.substring(0, 120) + '...' : fp.content}</p>
                    <span className={styles.forumPostMeta}>
                      💬 {fp.replyCount} · {new Date(fp.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}><p>No forum posts yet</p></div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'events' && (
          <div className={styles.eventsSection}>
            <h3>Events</h3>
            {loadingEvents ? (
              <div className={styles.empty}><Skeleton width="100%" height="1rem" /></div>
            ) : userEvents.length > 0 ? (
              <div className={styles.postsList}>
                {userEvents.map(ev => (
                  <Link key={ev.id} href={`/events/${ev.id}`} className={styles.forumPostCard}>
                    <span className={styles.forumPostCategory}>{ev.eventCategory || 'Event'}</span>
                    <h4>{ev.title}</h4>
                    {ev.eventDate && <p>{new Date(ev.eventDate).toLocaleDateString()}{ev.location ? ` · ${ev.location}` : ''}</p>}
                    <span className={styles.forumPostMeta}>👥 {ev._count?.eventJoiners ?? 0} attendees</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}><p>No events yet</p></div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'requests' && (
          <div className={styles.requestsSection}>
            <h3>Requests</h3>
            {loadingRequests ? (
              <div className={styles.empty}><Skeleton width="100%" height="1rem" /></div>
            ) : userRequests.length > 0 ? (
              <div className={styles.postsList}>
                {userRequests.map(r => (
                  <Link key={r.id} href={`/requests/${r.id}`} className={styles.forumPostCard}>
                    <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                    <h4>{r.title}</h4>
                    {r.description && <p>{r.description.length > 120 ? r.description.substring(0, 120) + '...' : r.description}</p>}
                    <span className={styles.forumPostMeta}>{r.category || 'General'} · {new Date(r.createdAt).toLocaleDateString()}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}><p>No requests yet</p></div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'shop' && (
          <div className={styles.shopSection}>
            {user.shopSlug && (
              <Link href={`/shop/${user.shopSlug}`} className={styles.viewShopLink}>
                View Full Shop →
              </Link>
            )}
            {products.length > 0 ? (
              <div className={styles.productsGrid}>
                {products.map((product) => (
                  <div key={product.id} className={`${styles.productCard} ${product.pinned ? styles.pinnedCard : ''}`}>
                    {isOwnProfile && (
                      <Button 
                        onClick={() => handlePin('product', product.id, product.pinned)} 
                        className={styles.cardPinBtn}
                        title={product.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        {product.pinned ? '📌' : '📍'}
                      </Button>
                    )}
                    <Link href={`/products/${product.id}`} className={styles.productCardLink}>
                      {product.imageUrl && (
                        <div className={styles.productImage}>
                          <Image src={product.imageUrl} alt={product.title} fill style={{objectFit: 'cover'}} />
                        </div>
                      )}
                      <div className={styles.productInfo}>
                        <span className={`badge badge-${(product.type || 'product').toLowerCase()}`}>
                          {product.pinned && '📌 '}{product.type}
                        </span>
                        <h3>{product.title}</h3>
                        {product.price && <p className={styles.productPrice}>${product.price}</p>}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No listings</p>
              </div>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'school' && (
          <div className={styles.schoolSection}>
            {user.schoolSlug && (
              <Link href={`/school/${user.schoolSlug}`} className={styles.schoolCard}>
                <h3>{user.schoolName || 'School'}</h3>
                <p>View School Content →</p>
              </Link>
            )}
          </div>
        )}

        {activeClass === null && activeTab === 'reviews' && (
          <div className={styles.reviewsSection}>
            <Rating userId={user.id} type="SELLER" />
          </div>
        )}

        {activeClass === null && activeTab === 'about' && (
          <div className={styles.aboutSection}>
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    placeholder="username"
                    maxLength={50}
                    pattern="[a-zA-Z0-9]+"
                  />
                  <small className={styles.formHint}>Profile URL: xistrymemz.xyz/profile/{editForm.username || 'username'}</small>
                </div>
                <div className={styles.formGroup}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Your display name"
                  />
                  <small className={styles.formHint}>Shown on your profile and posts</small>
                </div>
                <div className={styles.formGroup}>
                  <label>Profile Picture</label>
                  <ImageUploader images={editForm.image ? [editForm.image] : []} onChange={urls => setEditForm({ ...editForm, image: urls[0] || '' })} maxImages={1} />
                </div>
                <div className={styles.formGroup}>
                  <label>Cover Image</label>
                  <ImageUploader images={editForm.coverImage ? [editForm.coverImage] : []} onChange={urls => setEditForm({ ...editForm, coverImage: urls[0] || '' })} maxImages={1} />
                </div>
                <div className={styles.formGroup}>
                  <label>User Class (select multiple)</label>
                  <div className={styles.classGrid}>
                    {USER_CLASSES.map(cls => (
                      <label key={cls} className={styles.classOption}>
                        <input
                          type="checkbox"
                          checked={editForm.userClass.split(',').map(c => c.trim()).includes(cls)}
                          onChange={(e) => {
                            const classes = editForm.userClass.split(',').map(c => c.trim()).filter(Boolean)
                            if (e.target.checked) {
                              if (!classes.includes(cls)) classes.push(cls)
                            } else {
                              const idx = classes.indexOf(cls)
                              if (idx > -1) classes.splice(idx, 1)
                            }
                            setEditForm({ ...editForm, userClass: classes.join(', ') })
                          }}
                        />
                        <span>{cls}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className={styles.formActions}>
                  <Button type="submit" className={styles.saveBtn}>Save Changes</Button>
                  <Button type="button" onClick={() => setEditMode(false)} className={styles.cancelBtn}>
                    Cancel
                  </Button>
                </div>
              </form>
             ) : (
              <>
                <div className={styles.aboutBlock}>
                  <h3>Bio</h3>
                  <p>{user.bio || 'No bio provided yet.'}</p>
                </div>
                <div className={styles.aboutBlock}>
                  <h3>Details</h3>
                  <dl>
                    <dt>Role</dt>
                    <dd><RoleBadge role={user.role || 'USER'} size="small" /></dd>
                    {userClasses.length > 0 && (
                      <>
                        <dt>Classes</dt>
                        <dd>
                          <div className={styles.aboutClasses}>
                            {userClasses.map(cls => (
                              <span key={cls} className={styles.classBadge}>
                                <span className={styles.classIcon}>{CLASS_ICONS[cls] || '👤'}</span>
                                {cls}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </>
                    )}
                    <dt>Location</dt>
                    <dd>{user.location || 'Not specified'}</dd>
                    {user.neighborhood && (
                      <>
                        <dt>Neighborhood</dt>
                        <dd>{user.neighborhood}</dd>
                      </>
                    )}
                    {user.latitude && user.longitude && (
                      <>
                        <dt>Coordinates</dt>
                        <dd><code className={styles.coordCode}>{user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}</code></dd>
                      </>
                    )}
                    {user.searchRadius > 0 && (
                      <>
                        <dt>Search Radius</dt>
                        <dd>{user.searchRadius} km</dd>
                      </>
                    )}
                    <dt>Website</dt>
                    <dd>{user.website ? <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer">{user.website}</a> : 'Not specified'}</dd>
                    <dt>Member since</dt>
                    <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
                  </dl>
                </div>

                <div className={styles.aboutBlock}>
                  <h3>Earth Passport</h3>
                  <div className={styles.aboutPassportHeader}>
                    <span className={`${styles.passportMode} ${user.traveling ? styles.traveling : styles.home}`}>
                      {user.traveling ? 'Traveling' : 'Home'}
                    </span>
                    {(user.verificationLevel && user.verificationLevel !== 'NONE') && (
                      <span className={`${styles.verificationBadge} ${styles[(user.verificationLevel || 'none').toLowerCase()]}`}>
                        {user.verificationLevel}
                      </span>
                    )}
                  </div>
                  {user.earthId && (
                    <div className={styles.passportId}>
                      <span className={styles.passportIdLabel}>Passport ID</span>
                      <span className={styles.passportIdValue}>{user.earthId}</span>
                    </div>
                  )}
                    {user.latitude && user.longitude && (
                      <div className={styles.passportCoords}>
                        <span className={styles.coordLabel}>Coords</span>
                        <span className={styles.coordValue}>{user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}</span>
                      </div>
                    )}
                    {user.userLocations && user.userLocations.length > 0 && (
                      <div className={styles.userLocations}>
                        <span className={styles.locationsLabel}>Locations</span>
                        {user.userLocations.map(loc => (
                          <div key={loc.id} className={styles.locationItem}>
                            <span className={styles.locationName}>{loc.isPrimary ? '★' : '·'} {loc.name}</span>
                            <span className={styles.locationText}>{loc.location}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {user.reputationScore > 0 && (
                      <div className={styles.reputationScore}>
                        <span className={styles.reputationLabel}>Reputation</span>
                        <div className={styles.reputationBar}>
                          <div 
                            className={styles.reputationFill} 
                            style={{ width: `${Math.min(user.reputationScore, 100)}%` }}
                          />
                        </div>
                        <span className={styles.reputationValue}>{user.reputationScore.toFixed(0)}</span>
                      </div>
                    )}
                    <div className={styles.verificationBadges}>
                      {user.verifiedEmail && <span className={styles.vBadge}>✓ Email</span>}
                      {user.verifiedPhone && <span className={styles.vBadge}>✓ Phone</span>}
                      {user.verifiedIdentity && <span className={styles.vBadge}>✓ ID</span>}
                      {user.verifiedAddress && <span className={styles.vBadge}>✓ Address</span>}
                    </div>
                    {user.latitude && user.longitude && (
                      <div className={styles.passportMap}>
                        <MapContainer center={[user.latitude, user.longitude]} zoom={10} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker position={[user.latitude, user.longitude]}>
                            <Popup>
                              <strong>{user.name || 'User'}</strong>
                              <br />
                              {user.location || 'Earth'}
                            </Popup>
                          </Marker>
                        </MapContainer>
                      </div>
                    )}
                  </div>

                {user.badges && user.badges.length > 0 && (
                  <div className={styles.aboutBlock}>
                    <h3>Badges ({user.badges.length})</h3>
                    <div className={styles.badgesGrid}>
                      {user.badges.map(b => (
                        <div key={b.id} className={`${styles.badgeCard} ${styles[`tier${b.tier}`] || ''}`}>
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.name} className={styles.badgeIcon} />
                          ) : (
                            <span className={styles.badgeIcon}>🏅</span>
                          )}
                          <div className={styles.badgeInfo}>
                            <span className={styles.badgeName}>{b.name}</span>
                            {b.description && <span className={styles.badgeDesc}>{b.description}</span>}
                            <span className={styles.badgeTier}>{b.tier}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(user.links && user.links.length > 0) && (
                  <div className={styles.aboutBlock}>
                    <h3>All Links</h3>
                    <div className={styles.linksGrid}>
                      {user.links.map((link: UserLink) => (
                        <LinkCard key={link.id} link={link} styles={styles} />
                      ))}
                    </div>
                  </div>
                )}

                {user.acceptsDonations && (
                  <div className={styles.aboutBlock}>
                    <h3>Support with Donations</h3>
                    <div className={styles.donationsList}>
                      {(donationAddresses.length > 0 ? donationAddresses : (user.donationAddress ? [{
                        id: 'legacy',
                        currency: user.donationCurrency || 'ETH',
                        address: user.donationAddress,
                        label: null,
                        qrCodeUrl: null,
                      }] : [])).map(da => (
                        <DonationCard key={da.id} donation={da} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Connect with {user.name || 'User'}</h2>
            <p className={styles.modalDesc}>Send a message with your connection request:</p>
            <div className="form-group">
              <textarea
                value={connectMessage}
                onChange={(e) => setConnectMessage(e.target.value)}
                placeholder="Hi! I'd like to connect with you..."
                rows={4}
                className={styles.messageInput}
              />
            </div>
            <div className={styles.modalActions}>
              <Button onClick={() => setShowConnectModal(false)} variant="ghost">Cancel</Button>
              <Button onClick={handleConnect} disabled={connecting} variant="primary">
                {connecting ? 'Connecting...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDeletePost !== null}
        onClose={() => setConfirmDeletePost(null)}
        onConfirm={() => { if (confirmDeletePost) handleDeletePost(confirmDeletePost); setConfirmDeletePost(null) }}
        title="Delete Post"
        message="Delete this post? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() => { handleDisconnect(); setConfirmDisconnect(false) }}
        title="Disconnect"
        message="Disconnect from this user?"
        confirmLabel="Disconnect"
        variant="warning"
      />

      <BookAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        sellerId={user.id}
        sellerName={user.name}
      />
    </div>
  )
}
