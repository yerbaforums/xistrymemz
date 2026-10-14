'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import IpfsImage from '@/components/IpfsImage'
import IpfsCover from '@/components/IpfsCover'
import styles from './profile.module.css'
import Rating from '@/components/Rating'
import { getUserProfileUrl } from '@/lib/utils'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS } from '@/lib/constants'
import { CLASS_ICONS } from '@/lib/user-classes'
import RoleBadge from '@/components/RoleBadge'
import ActiveStatus from '@/components/ActiveStatus'
import LookingForCollaboratorsBadge from '@/components/LookingForCollaboratorsBadge'
import QualityBadge from '@/components/QualityBadge'
import HashtagText from '@/components/HashtagText'
import LinkPreview from '@/components/LinkPreview'
import Loading from '@/components/Loading'
import MentionInput from '@/components/MentionInput'
import ImageUploader from '@/components/ImageUploader'
import FollowButton from '@/components/FollowButton'
import { UserLiveBadge } from '@/components/LiveBadge'
import ShareBar from '@/components/ShareBar'
import EntityActions from '@/components/EntityActions'
import SharedItemCard from '@/components/SharedItemCard'
import MediaPlayer from '@/components/MediaPlayer'
import ReplySection from '@/components/ReplySection'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { MapContainer, TileLayer, Popup } from '@/components/LeafletComponents'
import EntityMarker from '@/components/EntityMarker'


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
  passportVisibility?: 'public' | 'hidden' | null
  timeZone?: string | null
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
  projectCount: number
  postCount: number
  productCount: number
  connectionCount: number
  followerCount: number
  followingCount: number
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
  organizedEventCount?: number
  totalEventCount?: number
  forumPostCount?: number
  forumReplyCount?: number
  badgeCount?: number
  dealsCount?: number
  requestCount?: number
  groupCount?: number
  badges?: Badge[]
  lookingForCollaborators?: boolean
  lastActiveAt?: string | null
  federatedUrl: string | null
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
  videoUrl?: string | null
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

interface ProjectData {
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

/** Split events into upcoming vs past (undated counts as upcoming). */
function splitUpcomingPast<T extends { eventDate: string | null }>(events: T[]): { upcoming: T[]; past: T[] } {
  const now = Date.now()
  const upcoming: T[] = []
  const past: T[] = []
  for (const e of events) {
    if (e.eventDate && new Date(e.eventDate).getTime() < now) past.push(e)
    else upcoming.push(e)
  }
  return { upcoming, past }
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
          <img src={`/crypto-logos/${CRYPTO_LOGOS[donation.currency] || 'crypto.svg'}`} alt="" width={24} height={24} />
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
        <img src={`/crypto-logos/${CRYPTO_LOGOS[donation.currency] || 'crypto.svg'}`} alt="" width={16} height={16} />
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
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<{ id: string; title: string; category: string; price: number | null; imageUrl: string | null; location: string | null; duration: number; createdAt: string }[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [donationAddresses, setDonationAddresses] = useState<DonationAddr[]>([])
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [postsOffset, setPostsOffset] = useState(0)
  const [totalPostCount, setTotalPostCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'projects' | 'connections' | 'groups' | 'forum' | 'events' | 'requests' | 'shop' | 'services' | 'school' | 'reviews' | 'about'>('posts')
  const [forumPosts, setForumPosts] = useState<ForumPostEntry[]>([])
  const [userEvents, setUserEvents] = useState<UserEventEntry[]>([])
  const [joinedEvents, setJoinedEvents] = useState<UserEventEntry[]>([])
  const [userRequests, setUserRequests] = useState<UserRequestEntry[]>([])
  const [loadingForum, setLoadingForum] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [newPostVideo, setNewPostVideo] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectMessage, setConnectMessage] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [likedPosts] = useState<Set<string>>(new Set())
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
      setProjects(data.projects || [])
      setProducts(data.products || [])
      setServices(data.services || [])
      setConnections(data.connections || [])
      setGroups(data.groups || [])
      setDonationAddresses(data.user.donationAddresses || [])
      setTotalPostCount(data.totalPostCount ?? data.posts?.length ?? 0)
      setHasMorePosts((data.totalPostCount ?? 0) > (data.posts?.length ?? 0))
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

  // Fetch events when tab is active: organized + joined, so the counts
  // always match a visible list (past events included in both).
  useEffect(() => {
    if (activeTab !== 'events' || !user) return
    const fetchEvents = async () => {
      setLoadingEvents(true)
      try {
        const [orgRes, joinedRes] = await Promise.all([
          fetch(`/api/events?organizerId=${user.id}`),
          fetch(`/api/events?participantId=${user.id}`),
        ])
        let organizedIds = new Set<string>()
        if (orgRes.ok) {
          const data = await orgRes.json()
          const organized = data || []
          setUserEvents(organized)
          organizedIds = new Set(organized.map((e: UserEventEntry) => e.id))
        }
        if (joinedRes.ok) {
          const data = await joinedRes.json()
          // Exclude events they organized (shown above) so nothing double-counts.
          setJoinedEvents((data || []).filter((e: UserEventEntry) => !organizedIds.has(e.id)))
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
        body: JSON.stringify({ image: url })
      })
      if (updateRes.ok) {
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
        body: JSON.stringify({ coverImage: url })
      })
      if (updateRes.ok) {
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
          images: newPostImages.length > 0 ? newPostImages : undefined,
          videoUrl: newPostVideo || null
        })
      })

      if (res.ok) {
        setNewPost('')
        setNewPostImages([])
        setNewPostVideo(null)
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
    return <div className={styles.container}><Loading size="medium" message="Loading profile..." /></div>
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
      <ShareBar entityType="PROFILE" title={(user.name || user.username || 'Profile')} description={user.bio} image={user.image} variant="compact" />
      <div className={styles.profileHeader}>
        <IpfsCover
          src={user.coverImage}
          className={styles.coverImage}
          style={{
            backgroundSize: user.coverStyle === 'contain' ? 'contain' : user.coverStyle === 'fill' ? '100% 100%' : user.coverStyle === 'repeat' ? 'auto' : 'cover',
            backgroundRepeat: user.coverStyle === 'repeat' ? 'repeat' : 'no-repeat'
          }}
        >
          {!user.coverImage && <div className={styles.coverPlaceholder} />}
          {isOwnProfile && (
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
        </IpfsCover>
        
           <div className={styles.profileContent}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar} style={{ cursor: isOwnProfile ? 'pointer' : undefined }} onClick={() => { if (isOwnProfile) avatarInputRef.current?.click() }}>
                  {user.image ? (
                    <IpfsImage src={user.image} alt={user.name || 'User'} thumbWidth={256} />
                  ) : (
                    <span>{user.name?.[0] || 'U'}</span>
                  )}
                  {isOwnProfile && (
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
                <>
                  <h1>{user.name || 'Anonymous User'}</h1>
                  <RoleBadge role={user.role || 'USER'} />
                  {user.id && <UserLiveBadge userId={user.id} />}
                  <ActiveStatus lastActiveAt={user.lastActiveAt} showLabel size={8} />
                  {user.lookingForCollaborators && <LookingForCollaboratorsBadge size="md" />}
                </>
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
               {user.location ? (
                 <span className={styles.metaItem}>
                   <span>📍</span> {user.location}
                 </span>
               ) : user.passportVisibility === 'hidden' && !isOwnProfile ? (
                 <span className={styles.metaItem} title="This user keeps their passport location private">
                   <span>🔒</span> Location private
                 </span>
               ) : null}
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
                {user.passportVisibility === 'hidden' && !isOwnProfile && (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    🔒 Passport location is private — scheduling and messaging still work.
                  </div>
                )}
              </div>

              <div className={styles.earthPassport} style={{ marginTop: 8 }}>
                <div className={styles.passportTopRow}>
                  <span className={styles.passportGlobe}>🗓️</span>
                  <span className={styles.passportName}>Schedule & Navigate</span>
                  {user.timeZone && <span className={styles.passportRadius}>{user.timeZone}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {!isOwnProfile && status === 'authenticated' && (
                    <Button onClick={() => setShowAppointmentModal(true)} className={styles.messageBtn}>📅 Book time</Button>
                  )}
                  <Link href={isOwnProfile ? '/dashboard/appointments' : `/dashboard/messages?user=${user.id}`} className={styles.messageBtn}>
                    {isOwnProfile ? '📅 My Planner' : '💬 Plan via message'}
                  </Link>
                  <Link href="/dashboard/planning" className={styles.messageBtn}>🗺️ Trip planning</Link>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                  Bookings live in My Planner with your events. Trips stay separate — link stops to events from planning.
                  {((user.latitude && user.longitude) || user.location) && !isOwnProfile ? (
                    <> Planning a visit? <Link href={`/dashboard/planning?stopName=${encodeURIComponent(user.name || user.username || 'Visit')}${user.location ? `&stopLoc=${encodeURIComponent(user.location)}` : ''}${user.latitude && user.longitude ? `&lat=${user.latitude}&lng=${user.longitude}` : ''}`}>Add a trip stop</Link> and navigate from there.</>
                  ) : null}
                </div>
              </div>

              {(user.badges && user.badges.length > 0) && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    padding: '4px 0',
                    marginTop: 8,
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {user.badges.map(badge => (
                    <QualityBadge key={badge.id} badge={badge} size="sm" />
                  ))}
                </div>
              )}

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
                <span className={styles.statValue}>{user.projectCount}</span>
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
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.followerCount}</span>
                <span className={styles.statLabel}>Followers</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{user.followingCount}</span>
                <span className={styles.statLabel}>Following</span>
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
              {(user.totalEventCount ?? (user.organizedEventCount ?? 0) + (user.eventCount ?? 0)) > 0 ? (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{user.totalEventCount ?? (user.organizedEventCount ?? 0) + (user.eventCount ?? 0)}</span>
                  <span className={styles.statLabel}>Events</span>
                </div>
              ) : null}
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
              <Link href="/profile/edit" className={styles.editBtn}>Edit Profile</Link>
            )             : status === 'authenticated' ? (
              <>
                <Link href={`/dashboard/messages?user=${user.id}`} className={styles.messageBtn}>Message</Link>
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

                <FollowButton userId={user.id} className={styles.followBtn} />

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
          className={`${styles.tab} ${activeTab === 'projects' ? styles.active : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects ({projects.length})
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
          Events {(user.totalEventCount ?? (user.organizedEventCount ?? 0) + (user.eventCount ?? 0)) > 0 ? `(${user.totalEventCount ?? (user.organizedEventCount ?? 0) + (user.eventCount ?? 0)})` : ''}
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
        {services.length > 0 && (
          <Button
            className={`${styles.tab} ${activeTab === 'services' ? styles.active : ''}`}
            onClick={() => setActiveTab('services')}
          >
            Services ({services.length})
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

      <div className={styles.content}>
        {activeTab === 'posts' && (
          <div className={styles.postsSection}>
            {status === 'authenticated' && (
              <form onSubmit={handleCreatePost} className={styles.createPost}>
                <div className={styles.postInputWrapper}>
                  <div className={styles.postAvatar}>
                    {session?.user?.image ? (
                      <IpfsImage src={session.user.image} alt="" thumbWidth={256} />
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
                  <ImageUploader images={newPostImages} onChange={setNewPostImages} videoUrl={newPostVideo} onVideoUrlChange={setNewPostVideo} />
                </div>
                <div className={styles.formPostActions}>
                  <span className={styles.charCount}>{newPost.length}/2000</span>
                  <Button type="submit" disabled={posting || !newPost.trim()} className={styles.postBtn}>
                    {posting ? 'Posting...' : (isOwnProfile ? 'Post' : 'Post on Wall')}
                  </Button>
                </div>
              </form>
            )}

            {(() => {
              const photos = posts.flatMap((p) => {
                try {
                  const arr = JSON.parse(p.images || 'null')
                  const first = Array.isArray(arr) ? arr[0] : (typeof p.imageUrl === 'string' ? p.imageUrl : null)
                  return typeof first === 'string' && first ? [{ id: p.id, url: first }] : []
                } catch {
                  return typeof p.imageUrl === 'string' && p.imageUrl ? [{ id: p.id, url: p.imageUrl }] : []
                }
              }).slice(0, 8)
              if (photos.length === 0) return null
              return (
                <div className={styles.photoStrip}>
                  {photos.map((ph) => (
                    <Link key={ph.id} href={`/posts/${ph.id}`} className={styles.photoThumb}>
                      <IpfsImage src={ph.url} alt="" thumbWidth={256} />
                    </Link>
                  ))}
                </div>
              )
            })()}

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
                                <IpfsImage src={post.user.image} alt="" thumbWidth={256} />
                              ) : (
                                <span>{post.user.name?.[0] || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <Link href={getUserProfileUrl(post.user)} className={styles.postAuthorName}>
                                {post.pinned && <span className={styles.pinnedBadge}>📌</span>}
                                {post.user.name || 'Anonymous'}
                              </Link>
                              {isWallPost && <span className={styles.wallPostBadge}> posted on {user.name || 'this user'}&apos;s wall</span>}
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

                        {(() => {
                          const imgs = getPostImages(post.images || null)
                          return imgs.length > 0 || post.videoUrl ? (
                            <div className={styles.postMedia}>
                              {imgs.length > 0 && (
                                <div className={`${styles.postImageGrid} ${imgs.length === 1 ? styles.postImageSingle : ''}`}>
                                  {imgs.map((url, i) => (
                                    <IpfsImage key={i} src={url} alt="" className={styles.postImage} thumbWidth={512} />
                                  ))}
                                </div>
                              )}
                              {post.videoUrl && (
                                <MediaPlayer url={post.videoUrl} poster={imgs[0] || undefined} />
                              )}
                            </div>
                          ) : null
                        })()}

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
                    {loadingMorePosts ? <Loading size="small" /> : `Load more posts (${(totalPostCount ?? 0) - posts.length} remaining)`}
                  </Button>
                )}
              </>
            ) : (
              <EmptyState icon="📝" title="No posts yet" description={isOwnProfile ? "Create your first post to share with the community." : `${user.name || 'This user'} hasn't posted anything yet.`} />
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className={styles.projectsSection}>
            {projects.length > 0 ? (
              <div className={styles.projectsGrid}>
                {projects.map((project) => (
                  <div key={project.id} className={`${styles.projectCard} ${project.pinned ? styles.pinnedCard : ''}`}>
                    {isOwnProfile && (
                      <Button 
                        onClick={() => handlePin('project', project.id, project.pinned)} 
                        className={styles.cardPinBtn}
                        title={project.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        {project.pinned ? '📌' : '📍'}
                      </Button>
                    )}
                    <Link href={`/projects/${project.id}`} className={styles.projectCardLink}>
                      <h3>
                        {project.pinned && <span className={styles.pinnedBadge}>📌</span>}
                        {project.title}
                      </h3>
                      <span className={`${styles.projectStatus} ${styles[(project.status || '').toLowerCase()]}`}>
                        {project.status}
                      </span>
                      <p>Created {new Date(project.createdAt).toLocaleDateString()}</p>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="🚀" title="No projects yet" description={isOwnProfile ? "Create a project to start tracking your goals." : `${user.name || 'This user'} hasn't created any projects yet.`} />
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className={styles.connectionsSection}>
            {connections.length > 0 ? (
              <div className={styles.connectionsGrid}>
                {connections.map((conn) => (
                  <Link key={conn.id} href={getUserProfileUrl(conn)} className={styles.connectionCard}>
                    <div className={styles.connectionAvatar}>
                      {conn.image ? (
                        <IpfsImage src={conn.image} alt={conn.name || 'User'} thumbWidth={256} />
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
              <EmptyState icon="🤝" title="No connections yet" description={isOwnProfile ? "Connect with other members to grow your network." : `${user.name || 'This user'} hasn't made any connections yet.`} />
            )}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className={styles.groupsSection}>
            {groups.length > 0 ? (
              <div className={styles.groupsGrid}>
                {groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
                    <div className={styles.groupIcon}>
                      {group.imageUrl ? (
                        <IpfsImage src={group.imageUrl} alt={group.name} thumbWidth={512} />
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

        {activeTab === 'forum' && (
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
              <EmptyState icon="💬" title="No forum posts yet" description={`${user.name || 'This user'} hasn't posted in any forums yet.`} />
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className={styles.eventsSection}>
            <h3>Events</h3>
            {loadingEvents ? (
              <div className={styles.empty}><Skeleton width="100%" height="1rem" /></div>
            ) : (userEvents.length > 0 || joinedEvents.length > 0) ? (
              <>
                {userEvents.length > 0 && (
                  <>
                    <h4 className={styles.eventSubhead}>Hosting ({userEvents.length})</h4>
                    <div className={styles.postsList}>
                      {splitUpcomingPast(userEvents).upcoming.map(ev => (
                        <Link key={ev.id} href={`/events/${ev.id}`} className={styles.forumPostCard}>
                          <span className={styles.forumPostCategory}>{ev.eventCategory || 'Event'}</span>
                          <h4>{ev.title}</h4>
                          {ev.eventDate && <p>{new Date(ev.eventDate).toLocaleDateString()}{ev.location ? ` · ${ev.location}` : ''}</p>}
                          <span className={styles.forumPostMeta}>👥 {ev._count?.eventJoiners ?? 0} attendees</span>
                        </Link>
                      ))}
                    </div>
                    {splitUpcomingPast(userEvents).past.length > 0 && (
                      <>
                        <h4 className={styles.eventSubheadMuted}>Past hosted ({splitUpcomingPast(userEvents).past.length})</h4>
                        <div className={styles.postsList}>
                          {splitUpcomingPast(userEvents).past.map(ev => (
                            <Link key={ev.id} href={`/events/${ev.id}`} className={styles.forumPostCard}>
                              <span className={styles.forumPostCategory}>{ev.eventCategory || 'Event'}</span>
                              <h4>{ev.title}</h4>
                              {ev.eventDate && <p>{new Date(ev.eventDate).toLocaleDateString()}{ev.location ? ` · ${ev.location}` : ''}</p>}
                              <span className={styles.forumPostMeta}>👥 {ev._count?.eventJoiners ?? 0} attendees</span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
                {joinedEvents.length > 0 && (
                  <>
                    <h4 className={styles.eventSubhead}>Joined ({joinedEvents.length})</h4>
                    <div className={styles.postsList}>
                      {splitUpcomingPast(joinedEvents).upcoming.map(ev => (
                        <Link key={ev.id} href={`/events/${ev.id}`} className={styles.forumPostCard}>
                          <span className={styles.forumPostCategory}>{ev.eventCategory || 'Event'}</span>
                          <h4>{ev.title}</h4>
                          {ev.eventDate && <p>{new Date(ev.eventDate).toLocaleDateString()}{ev.location ? ` · ${ev.location}` : ''}</p>}
                          <span className={styles.forumPostMeta}>👥 {ev._count?.eventJoiners ?? 0} attendees</span>
                        </Link>
                      ))}
                    </div>
                    {splitUpcomingPast(joinedEvents).past.length > 0 && (
                      <>
                        <h4 className={styles.eventSubheadMuted}>Past attended ({splitUpcomingPast(joinedEvents).past.length})</h4>
                        <div className={styles.postsList}>
                          {splitUpcomingPast(joinedEvents).past.map(ev => (
                            <Link key={ev.id} href={`/events/${ev.id}`} className={styles.forumPostCard}>
                              <span className={styles.forumPostCategory}>{ev.eventCategory || 'Event'}</span>
                              <h4>{ev.title}</h4>
                              {ev.eventDate && <p>{new Date(ev.eventDate).toLocaleDateString()}{ev.location ? ` · ${ev.location}` : ''}</p>}
                              <span className={styles.forumPostMeta}>👥 {ev._count?.eventJoiners ?? 0} attendees</span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <EmptyState icon="📅" title="No events yet" description={`${user.name || 'This user'} hasn't hosted or joined any events yet.`} />
            )}
          </div>
        )}

        {activeTab === 'requests' && (
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
              <EmptyState icon="📋" title="No requests yet" description={`${user.name || 'This user'} hasn't made any requests yet.`} />
            )}
          </div>
        )}

        {activeTab === 'shop' && (
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
                          <IpfsImage src={product.imageUrl} alt={product.title} thumbWidth={512} />
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
              <EmptyState icon="🛒" title="No listings" description={`${user.name || 'This user'} hasn't listed any products or services yet.`} />
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className={styles.shopSection}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px' }}>
              Bookable services — pick a time or send an inquiry for a quote.
            </p>
            {services.length > 0 ? (
              <div className={styles.productsGrid}>
                {services.map((service) => (
                  <div key={service.id} className={styles.productCard}>
                    <Link href={`/services/${service.id}`} className={styles.productCardLink}>
                      {service.imageUrl && (
                        <div className={styles.productImage}>
                          <IpfsImage src={service.imageUrl} alt={service.title} thumbWidth={512} />
                        </div>
                      )}
                      <div className={styles.productInfo}>
                        <span className="badge badge-category">
                          {service.category.replace(/_/g, ' ')}
                        </span>
                        <h3>{service.title}</h3>
                        {service.price != null
                          ? <p className={styles.productPrice}>${service.price}</p>
                          : <p className={styles.productPrice}>Quote on inquiry</p>}
                        {service.location && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>📍 {service.location}</p>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="🔧" title="No services" description={`${user.name || 'This user'} hasn't listed any services yet.`} />
            )}
          </div>
        )}

        {activeTab === 'school' && (
          <div className={styles.schoolSection}>
            {user.schoolSlug && (
              <Link href={`/school/${user.schoolSlug}`} className={styles.schoolCard}>
                <h3>{user.schoolName || 'School'}</h3>
                <p>View School Content →</p>
              </Link>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className={styles.reviewsSection}>
            <Rating userId={user.id} type="SELLER" />
          </div>
        )}

        {activeTab === 'about' && (
          <div className={styles.aboutSection}>
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
                          <EntityMarker type="MEMBER" position={[user.latitude, user.longitude]}>
                            <Popup>
                              <strong>{user.name || 'User'}</strong>
                              <br />
                              {user.location || 'Earth'}
                            </Popup>
                          </EntityMarker>
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
                            <IpfsImage src={b.imageUrl} alt={b.name} className={styles.badgeIcon} thumbWidth={256} />
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
                        currency: user.donationCurrency || 'XMR',
                        address: user.donationAddress,
                        label: null,
                        qrCodeUrl: null,
                      }] : [])).map(da => (
                        <DonationCard key={da.id} donation={da} />
                      ))}
                    </div>
                  </div>
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
