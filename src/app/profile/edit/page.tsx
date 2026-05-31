'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAllCryptos } from '@/lib/crypto-icons'
import { getUserProfileUrl } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'
import ImageUploader from '@/components/ImageUploader'
import AvailabilityEditor from '@/components/AvailabilityEditor'
import Skeleton from '@/components/Skeleton'
import { USER_CLASSES, CLASS_ICONS } from '@/lib/user-classes'
import styles from '../[username]/profile.module.css'

interface UserLink {
  id: string
  type: string
  url: string
  label?: string | null
  icon?: string | null
  sortOrder: number
}

interface UserLocation {
  id: string
  name: string
  location: string
  latitude: number | null
  longitude: number | null
  isPrimary: boolean
  categoryId: string | null
  tags: string | null
  notes: string | null
  imageUrl: string | null
  category: { id: string; name: string; icon: string; color: string } | null
}

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
  sortOrder: number
}

const SOCIAL_TYPES = [
  { type: 'website', label: 'Website', defaultIcon: '🔗' },
  { type: 'twitter', label: 'Twitter / X', defaultIcon: '/social-logos/twitter.svg' },
  { type: 'github', label: 'GitHub', defaultIcon: '/social-logos/github.svg' },
  { type: 'instagram', label: 'Instagram', defaultIcon: '/social-logos/instagram.svg' },
  { type: 'linkedin', label: 'LinkedIn', defaultIcon: '/social-logos/linkedin.svg' },
  { type: 'youtube', label: 'YouTube', defaultIcon: '/social-logos/youtube.svg' },
  { type: 'tiktok', label: 'TikTok', defaultIcon: '/social-logos/tiktok.svg' },
  { type: 'discord', label: 'Discord', defaultIcon: '/social-logos/discord.svg' },
  { type: 'telegram', label: 'Telegram', defaultIcon: '/social-logos/telegram.svg' },
  { type: 'custom', label: 'Custom Link', defaultIcon: '🔗' }
]

export default function ProfileEditPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userData, setUserData] = useState<{ id: string; name: string | null; username: string | null; shopSlug: string | null } | null>(null)

  // Profile fields
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [image, setImage] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [coverStyle, setCoverStyle] = useState('cover')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [userClass, setUserClass] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [paymentAddress, setPaymentAddress] = useState('')
  const [refundAddress, setRefundAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState('ETH')

  // Earth Passport fields
  const [neighborhood, setNeighborhood] = useState('')
  const [searchRadius, setSearchRadius] = useState(50)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [traveling, setTraveling] = useState(false)
  const [lookingForCollaborators, setLookingForCollaborators] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false) // kept for passport link

  // Donation fields
  const [donationAddresses, setDonationAddresses] = useState<DonationAddr[]>([])
  const [showDonationForm, setShowDonationForm] = useState(false)
  const [editingDonation, setEditingDonation] = useState<DonationAddr | null>(null)
  const [donationForm, setDonationForm] = useState({ currency: 'ETH', address: '', label: '', showQR: true })
  const [donationSaving, setDonationSaving] = useState(false)
  const [acceptsDonations, setAcceptsDonations] = useState(false)
  const [showShop, setShowShop] = useState(true)
  const [showSchool, setShowSchool] = useState(true)
  const [enableTips, setEnableTips] = useState(true)
  const [enableReplies, setEnableReplies] = useState(true)
  const [enableLikes, setEnableLikes] = useState(true)
  const [showViewCount, setShowViewCount] = useState(true)

  // Links
  const [links, setLinks] = useState<UserLink[]>([])
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [editingLink, setEditingLink] = useState<UserLink | null>(null)
  const [linkForm, setLinkForm] = useState({ type: 'website', url: '', label: '', icon: '' })
  const [linkSaving, setLinkSaving] = useState(false)
  const [confirmDeleteLink, setConfirmDeleteLink] = useState<string | null>(null)
  const [confirmDeleteDonation, setConfirmDeleteDonation] = useState<string | null>(null)
  const { success: toastSuccess, error: toastError } = useToast()

  // Locations (moved to /dashboard/passport)

  const allCryptos = getAllCryptos()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session])

  const fetchLinks = async () => {
    try {
      const r = await fetch('/api/users/links')
      if (r.ok) setLinks((await r.json()).links || [])
    } catch {}
  }

  const fetchData = async () => {
    try {
      const res = await fetch('/api/users/me')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      const user = data.user
      setUserData({ id: user.id, name: user.name, username: user.username, shopSlug: user.shopSlug })
      setName(user.name || '')
      setUsername(user.username || '')
      setBio(user.bio || '')
      setImage(user.image || '')
      setCoverImage(user.coverImage || '')
      setCoverStyle(user.coverStyle || 'cover')
      setLocation(user.location || '')
      setWebsite(user.website || '')
      setUserClass(user.userClass || '')
      setWalletAddress(user.walletAddress || '')
      setPaymentAddress(user.paymentAddress || '')
      setRefundAddress(user.refundAddress || '')
      setCryptoCurrency(user.cryptoCurrency || 'ETH')
      setNeighborhood(user.neighborhood || '')
      setSearchRadius(user.searchRadius || 50)
      setLatitude(user.latitude || null)
      setLongitude(user.longitude || null)
      setTraveling(user.traveling || false)
      setLookingForCollaborators(user.lookingForCollaborators || false)
      setAcceptsDonations(user.acceptsDonations || false)
      setShowShop(user.showShop ?? true)
      setShowSchool(user.showSchool ?? true)
      setEnableTips(user.enableTips ?? true)
      setEnableReplies(user.enableReplies ?? true)
      setEnableLikes(user.enableLikes ?? true)
      setShowViewCount(user.showViewCount ?? true)
      setLinks(data.links || [])

      try { const r = await fetch('/api/users/donations'); if (r.ok) setDonationAddresses((await r.json()).addresses || []) } catch {}
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // Location CRUD (moved to /dashboard/passport)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, username, bio, image, coverImage, coverStyle, location, website, userClass,
            walletAddress, paymentAddress, refundAddress, cryptoCurrency,
            acceptsDonations, neighborhood, searchRadius,
            latitude: latitude ?? null, longitude: longitude ?? null,
            traveling, lookingForCollaborators,
            showShop, showSchool, enableTips, enableReplies, enableLikes, showViewCount
          })
      })

      if (!res.ok) throw new Error('Failed to update')
      await update()

      const oldUsername = userData?.username
      const newUsername = username?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
      if (newUsername && newUsername !== oldUsername) {
        router.push(`/profile/${newUsername}`)
      } else {
        toastSuccess('Profile updated successfully!')
      }
    } catch {
      toastError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkSaving(true)

    try {
      const url = editingLink
        ? `/api/users/links/${editingLink.id}`
        : '/api/users/links'
      const method = editingLink ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkForm)
      })

      if (!res.ok) throw new Error('Failed to save link')

      setShowLinkForm(false)
      setEditingLink(null)
      setLinkForm({ type: 'website', url: '', label: '', icon: '' })
      fetchLinks()
    } catch {
      toastError('Failed to save link')
    } finally {
      setLinkSaving(false)
    }
  }

  const handleDeleteLink = async (id: string) => {
    try {
      const res = await fetch(`/api/users/links/${id}`, { method: 'DELETE' })
      if (!res.ok) toastError('Failed to delete link')
      fetchLinks()
    } catch {
      toastError('Failed to delete link')
    }
  }

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault()
    setDonationSaving(true)
    try {
      if (editingDonation) {
        const res = await fetch(`/api/users/donations/${editingDonation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(donationForm)
        })
        if (!res.ok) throw new Error('Failed to update')
      } else {
        const res = await fetch('/api/users/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(donationForm)
        })
        if (!res.ok) throw new Error('Failed to create')
      }
      setShowDonationForm(false)
      setEditingDonation(null)
      setDonationForm({ currency: 'ETH', address: '', label: '', showQR: true })
      fetchData()
    } catch {
      toastError('Failed to save donation address')
    } finally {
      setDonationSaving(false)
    }
  }

  const handleDeleteDonation = async (id: string) => {
    try {
      const res = await fetch(`/api/users/donations/${id}`, { method: 'DELETE' })
      if (!res.ok) toastError('Failed to delete donation address')
      fetchData()
    } catch {
      toastError('Failed to delete donation address')
    }
  }

  const handleReorderDonations = async (draggedIndex: number, targetIndex: number) => {
    const newAddresses = [...donationAddresses]
    const [draggedItem] = newAddresses.splice(draggedIndex, 1)
    newAddresses.splice(targetIndex, 0, draggedItem)
    setDonationAddresses(newAddresses)

    for (let i = 0; i < newAddresses.length; i++) {
      if (newAddresses[i].sortOrder !== i) {
        await fetch(`/api/users/donations/${newAddresses[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: i })
        })
      }
    }
  }

  const getSocialType = (type: string) => {
    return SOCIAL_TYPES.find(t => t.type === type) || SOCIAL_TYPES[0]
  }

  const handleReorderLinks = async (draggedIndex: number, targetIndex: number) => {
    const newLinks = [...links]
    const [draggedItem] = newLinks.splice(draggedIndex, 1)
    newLinks.splice(targetIndex, 0, draggedItem)
    setLinks(newLinks)

    for (let i = 0; i < newLinks.length; i++) {
      if (newLinks[i].sortOrder !== i) {
        await fetch(`/api/users/links/${newLinks[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: i })
        })
      }
    }
  }

  if (loading) {
    return <Skeleton />
  }

  return (
    <div className={styles.container}>
      <div className={styles.editPageWrapper}>
        <div className={`${styles.flexBetween} ${styles.mb30}`}>
          <h1>Edit Profile</h1>
          <Link href={getUserProfileUrl({ id: session?.user?.id || '', username: username || undefined })} className={styles.editBtn}>
            View Profile
          </Link>
        </div>

        {error && <div className={`${styles.error || 'error'} ${styles.errorBox}`}>{error}</div>}

        <form onSubmit={handleSaveProfile}>
          {/* Basic Info */}
          <div className={styles.cardMb}>
            <h2 className={styles.sectionTitle}>Basic Information</h2>

            <div className={styles.mb16}>
              <label className={styles.label}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder="username" maxLength={50} className={styles.inputField} />
              <small className={styles.small}>Letters and numbers only. Profile URL: xistrymemz.xyz/profile/{username || 'username'}</small>
            </div>

            <div className={styles.mb16}>
              <label className={styles.label}>Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={styles.inputField} />
            </div>

            <div className={styles.mb16}>
              <label className={styles.label}>Avatar</label>
              <ImageUploader images={image ? [image] : []} onChange={urls => setImage(urls[0] || '')} maxImages={1} />
            </div>

            <div className={styles.mb16}>
              <label className={styles.label}>Cover Image</label>
              <ImageUploader images={coverImage ? [coverImage] : []} onChange={urls => setCoverImage(urls[0] || '')} maxImages={1} />
              {coverImage && (
                <div className={styles.coverPreview} style={{ '--bg-image': `url(${coverImage})`, '--bg-size': coverStyle === 'contain' ? 'contain' : coverStyle === 'fill' ? '100% 100%' : coverStyle === 'repeat' ? 'auto' : 'cover', '--bg-repeat': coverStyle === 'repeat' ? 'repeat' : 'no-repeat' } as React.CSSProperties} />
              )}
              <div className={`${styles.flexWrap} ${styles.gap6} ${styles.mt8}`}>
                {['cover', 'contain', 'fill', 'repeat'].map(s => (
                  <button key={s} type="button" onClick={() => setCoverStyle(s)} className={`${styles.coverStyleBtn} ${coverStyle === s ? styles.coverStyleBtnActive : ''}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <AvailabilityEditor userId={session?.user.id ?? ''} />

            <div className={styles.mb16}>
              <label className={styles.label}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={styles.textareaField} />
            </div>

            <div className={styles.mb16}>
              <label className={styles.label}>Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" className={styles.inputField} />
            </div>

            <div>
              <label className={styles.label}>User Classes (select multiple)</label>
              <div className={styles.classGridEdit}>
                {USER_CLASSES.map(cls => {
                  const checked = userClass.split(',').map(c => c.trim()).includes(cls)
                  return (
                    <label key={cls} className={`${styles.classLabel} ${checked ? styles.classLabelActive : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const classes = userClass.split(',').map(c => c.trim()).filter(Boolean)
                        if (checked) {
                          setUserClass(classes.filter(c => c !== cls).join(', '))
                        } else {
                          setUserClass([...classes, cls].join(', '))
                        }
                      }} className={styles.autoWidth} />
                      <span>{CLASS_ICONS[cls] || ''} {cls}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className={styles.mb16}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={lookingForCollaborators}
                  onChange={e => setLookingForCollaborators(e.target.checked)}
                  className={styles.checkboxInput}
                />
                <span>🤝 Looking for collaborators</span>
              </label>
              <p className={styles.mutedText}>
                Show a badge on your profile and member cards indicating you're open to collaboration.
              </p>
            </div>
          </div>

          {/* Earth Passport */}
          <div className={styles.editPassportSection}>
            <h2 className={styles.editPassportTitle}>🌍 Earth Passport</h2>
            <p className={styles.editPassportDesc}>
              Manage your Earth Passport settings — location, neighborhood, search radius, traveling mode, and GPS coordinates.
            </p>
            <a href="/dashboard/passport" className={styles.passportLinkBtn}>
              🌍 Open Passport Dashboard →
            </a>
          </div>

          {/* Saved Locations */}
          <div className={styles.editLocationSection}>
            <h2 className={styles.editLocationTitle}>📍 Saved Locations</h2>
            <p className={styles.editLocationDesc}>
              Manage your saved places, location categories, and set your primary location.
            </p>
            <a href="/dashboard/passport" className={styles.locationLinkBtn}>
              📍 Open Locations Dashboard →
            </a>
          </div>

          {/* Wallet Addresses - DISABLED until wallet features enabled */}
          <div className={styles.disabledSection}>
            <h2 className={styles.sectionTitle}>Wallet Addresses <span className={`${styles.small} ${styles.ml8}`}>— Coming Soon</span></h2>

            <div className={styles.mb16}>
              <label className={styles.label}>Wallet Address</label>
              <input type="text" value={walletAddress} disabled placeholder="0x..." className={styles.inputMuted} />
            </div>

            <div className={styles.mb16}>
              <label className={styles.label}>Payment Address</label>
              <input type="text" value={paymentAddress} disabled placeholder="0x..." className={styles.inputMuted} />
            </div>

            <div className={styles.mb16}>
              <label className={styles.label}>Refund Address</label>
              <input type="text" value={refundAddress} disabled placeholder="0x..." className={styles.inputMuted} />
            </div>

            <div>
              <label className={styles.label}>Default Currency</label>
              <div className={styles.cryptoGrid}>
                {allCryptos.map(crypto => (
                  <div key={crypto.id} className={styles.cryptoCard}>
                    {crypto.icon && <img src={crypto.icon} alt="" width={16} height={16} className={styles.roundImg} />}
                    {crypto.symbol}
                  </div>
                ))}
              </div>
            </div>
          </div>

        <button type="submit" disabled={saving} className={styles.saveBtnFull}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Donation Settings */}
      <div className={styles.cardMt}>
          <div className={`${styles.flexBetween} ${styles.mb20}`}>
            <h2 className={styles.m0}>Donation Addresses</h2>
            <button
              type="button"
              onClick={() => { setShowDonationForm(true); setEditingDonation(null); setDonationForm({ currency: 'ETH', address: '', label: '', showQR: true }) }}
              className={styles.btnPrimary}
            >
              + Add Address
            </button>
          </div>

          <div className={styles.mb16}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={acceptsDonations}
                onChange={e => setAcceptsDonations(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span>Accept donations on my profile</span>
            </label>
          </div>

          {donationAddresses.length === 0 && !showDonationForm && acceptsDonations && (
            <p className={styles.emptyState}>
              No donation addresses yet. Add crypto addresses to receive donations with QR codes.
            </p>
          )}

          {donationAddresses.map((da, index) => {
            const crypto = allCryptos.find(c => c.id === da.currency)
            return (
              <div
                key={da.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                  if (draggedIndex !== index) handleReorderDonations(draggedIndex, index)
                }}
                className={styles.donCard}
              >
                <div className={styles.dragHandle} title="Drag to reorder">
                  ⠿
                </div>
                <div className={styles.flex1}>
                  <div className={styles.donNameRow}>
                    {crypto?.icon && <img src={crypto.icon} alt="" width={20} height={20} className={styles.roundImg} />}
                    <span className={styles.donLabel}>{da.label || crypto?.name || da.currency}</span>
                    {!da.showQR && <span className={styles.donQrLabel}>(QR hidden)</span>}
                  </div>
                  <code className={styles.donCode}>{da.address}</code>
                </div>
                <div className={`${styles.gap6} ${styles.flex}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDonation(da)
                      setDonationForm({ currency: da.currency, address: da.address, label: da.label || '', showQR: da.showQR })
                      setShowDonationForm(true)
                    }}
                    className={styles.btnSmall}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteDonation(da.id)}
                    className={styles.btnDanger}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {showDonationForm && (
            <form onSubmit={handleSaveDonation} className={`${styles.formCard} ${styles.mt16}`}>
              <h3 className={`${styles.h3Mt0} ${styles.mb12}`}>{editingDonation ? 'Edit Donation Address' : 'Add Donation Address'}</h3>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>Currency</label>
                <div className={styles.cryptoBtnGrid}>
                  {allCryptos.map(crypto => (
                    <button
                      key={crypto.id}
                      type="button"
                      onClick={() => setDonationForm({...donationForm, currency: crypto.id})}
                      className={`${styles.cryptoBtn} ${donationForm.currency === crypto.id ? styles.cryptoBtnActive : ''}`}
                    >
                      {crypto.icon && <img src={crypto.icon} alt="" width={14} height={14} className={styles.roundImg} />}
                      {crypto.symbol}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>{donationForm.currency} Address</label>
                <input
                  type="text"
                  value={donationForm.address}
                  onChange={e => setDonationForm({...donationForm, address: e.target.value})}
                  placeholder={`Enter your ${donationForm.currency} address...`}
                  required
                  className={styles.donInput}
                />
              </div>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>Label (optional)</label>
                <input
                  type="text"
                  value={donationForm.label}
                  onChange={e => setDonationForm({...donationForm, label: e.target.value})}
                  placeholder="e.g., Main Wallet, Cold Storage..."
                  className={styles.donInput}
                />
              </div>

              <div className={styles.mb16}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={donationForm.showQR}
                    onChange={e => setDonationForm({...donationForm, showQR: e.target.checked})}
                    className={styles.checkboxInput}
                  />
                  <span>Show QR code on profile</span>
                </label>
              </div>

              <div className={`${styles.flexEnd} ${styles.gap8}`}>
                <button
                  type="button"
                  onClick={() => { setShowDonationForm(false); setEditingDonation(null) }}
                  className={styles.btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={donationSaving}
                  className={styles.btnPrimary}
                >
                  {donationSaving ? 'Saving...' : (editingDonation ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          )}
        </div>

      {/* Feature Visibility Toggles */}
      <div className={styles.cardMt}>
        <h2 className={styles.sectionTitle}>Feature Visibility</h2>
        <p className={styles.sectionDesc}>
          Control which features and content sections are visible on your profile and content.
        </p>

        <div className={styles.mb12}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={showShop} onChange={e => setShowShop(e.target.checked)} className={styles.checkboxInput} />
            <span>🛍️ Show shop on profile</span>
          </label>
        </div>

        <div className={styles.mb12}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={showSchool} onChange={e => setShowSchool(e.target.checked)} className={styles.checkboxInput} />
            <span>🏫 Show school on profile</span>
          </label>
        </div>

        <div className={styles.mb12}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={enableTips} onChange={e => setEnableTips(e.target.checked)} className={styles.checkboxInput} />
            <span>💎 Enable tips on content</span>
          </label>
        </div>

        <div className={styles.mb12}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={enableReplies} onChange={e => setEnableReplies(e.target.checked)} className={styles.checkboxInput} />
            <span>💬 Enable replies on content</span>
          </label>
        </div>

        <div className={styles.mb12}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={enableLikes} onChange={e => setEnableLikes(e.target.checked)} className={styles.checkboxInput} />
            <span>❤️ Enable likes on content</span>
          </label>
        </div>

        <div>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={showViewCount} onChange={e => setShowViewCount(e.target.checked)} className={styles.checkboxInput} />
            <span>👁️ Show view count</span>
          </label>
        </div>
      </div>

      {/* Social Links Section */}
      <div className={styles.cardMt}>
          <div className={`${styles.flexBetween} ${styles.mb20}`}>
            <h2 className={styles.m0}>Social Links</h2>
            <button
              type="button"
              onClick={() => { setShowLinkForm(true); setEditingLink(null); setLinkForm({ type: 'website', url: '', label: '', icon: '' }) }}
              className={styles.btnPrimary}
            >
              + Add Link
            </button>
          </div>

          {links.length === 0 && !showLinkForm && (
            <p className={styles.emptyLinkState}>No links added yet. Add your social media and website links!</p>
          )}

          {links.map((link, index) => {
            const socialType = getSocialType(link.type)
            return (
              <div
                key={link.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                  if (draggedIndex !== index) handleReorderLinks(draggedIndex, index)
                }}
                className={styles.linkCard}
              >
                <div className={styles.dragHandle} title="Drag to reorder">
                  ⠿
                </div>
                <div className={styles.linkIconContainer}>
                  {link.icon ? (
                    <img src={link.icon} alt={socialType.label} width={24} height={24} className={styles.roundImg4} />
                  ) : socialType.defaultIcon.startsWith('/') ? (
                    <img src={socialType.defaultIcon} alt={socialType.label} width={24} height={24} className={styles.roundImg4} />
                  ) : (
                    <span>{socialType.defaultIcon}</span>
                  )}
                </div>
                <div className={styles.flex1}>
                  <div className={styles.linkName}>{link.label || socialType.label}</div>
                  <div className={styles.linkUrl}>{link.url}</div>
                </div>
                <div className={`${styles.flex} ${styles.gap8}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLink(link)
                      setLinkForm({ type: link.type, url: link.url, label: link.label || '', icon: link.icon || '' })
                      setShowLinkForm(true)
                    }}
                    className={styles.btnGhost}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLink(link.id)}
                    className={styles.btnDanger}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {showLinkForm && (
            <form onSubmit={handleSaveLink} className={styles.linkFormCard}>
              <h3 className={styles.h3Mt0}>{editingLink ? 'Edit Link' : 'Add New Link'}</h3>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>Link Type</label>
                <select
                  value={linkForm.type}
                  onChange={e => setLinkForm({...linkForm, type: e.target.value})}
                  className={styles.selectField}
                >
                  {SOCIAL_TYPES.map(t => (
                    <option key={t.type} value={t.type}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>URL</label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={e => setLinkForm({...linkForm, url: e.target.value})}
                  placeholder="https://..."
                  required
                  className={styles.selectField}
                />
              </div>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>Label (optional)</label>
                <input
                  type="text"
                  value={linkForm.label}
                  onChange={e => setLinkForm({...linkForm, label: e.target.value})}
                  placeholder="Custom label..."
                  className={styles.selectField}
                />
              </div>

              <div className={styles.mb12}>
                <label className={styles.donFormLabel}>Custom Icon URL (optional)</label>
                <input
                  type="url"
                  value={linkForm.icon}
                  onChange={e => setLinkForm({...linkForm, icon: e.target.value})}
                  placeholder="https://example.com/icon.png"
                  className={styles.selectField}
                />
                {linkForm.icon && (
                  <div className={styles.iconPreviewRow}>
                    <span className={styles.previewLabel}>Preview:</span>
                    <img src={linkForm.icon} alt="Icon preview" width={20} height={20} className={styles.roundImg4} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
              </div>

              <div className={`${styles.flexEnd} ${styles.gap8}`}>
                <button
                  type="button"
                  onClick={() => { setShowLinkForm(false); setEditingLink(null) }}
                  className={styles.btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkSaving}
                  className={styles.btnPrimary}
                >
                  {linkSaving ? 'Saving...' : (editingLink ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteLink !== null}
        onClose={() => setConfirmDeleteLink(null)}
        onConfirm={() => { if (confirmDeleteLink) handleDeleteLink(confirmDeleteLink) }}
        title="Delete Link"
        message="Delete this link?"
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmDeleteDonation !== null}
        onClose={() => setConfirmDeleteDonation(null)}
        onConfirm={() => { if (confirmDeleteDonation) handleDeleteDonation(confirmDeleteDonation) }}
        title="Delete Donation Address"
        message="Delete this donation address?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
