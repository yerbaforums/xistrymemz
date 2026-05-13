'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getAllCryptos, getCryptoIcon, getCryptoName } from '@/lib/crypto-icons'
import { getUserProfileUrl } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'
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
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userData, setUserData] = useState<{ id: string; name: string | null; username: string | null; shopSlug: string | null } | null>(null)

  // Profile fields
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
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
  const [geoLoading, setGeoLoading] = useState(false)

  // Donation fields
  const [donationAddresses, setDonationAddresses] = useState<DonationAddr[]>([])
  const [showDonationForm, setShowDonationForm] = useState(false)
  const [editingDonation, setEditingDonation] = useState<DonationAddr | null>(null)
  const [donationForm, setDonationForm] = useState({ currency: 'ETH', address: '', label: '', showQR: true })
  const [donationSaving, setDonationSaving] = useState(false)
  const [acceptsDonations, setAcceptsDonations] = useState(false)

  // Links
  const [links, setLinks] = useState<UserLink[]>([])
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [editingLink, setEditingLink] = useState<UserLink | null>(null)
  const [linkForm, setLinkForm] = useState({ type: 'website', url: '', label: '', icon: '' })
  const [linkSaving, setLinkSaving] = useState(false)
  const [confirmDeleteLink, setConfirmDeleteLink] = useState<string | null>(null)
  const [confirmDeleteDonation, setConfirmDeleteDonation] = useState<string | null>(null)
  const { success: toastSuccess, error: toastError } = useToast()

  // Locations
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([])
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [locationForm, setLocationForm] = useState({ name: '', location: '', latitude: '', longitude: '' })
  const [locationSaving, setLocationSaving] = useState(false)

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
      setAcceptsDonations(user.acceptsDonations || false)
      const [donationsRes, locationsRes] = await Promise.all([
        fetch('/api/users/donations'),
        fetch('/api/users/locations')
      ])
      if (donationsRes.ok) {
        const donationsData = await donationsRes.json()
        setDonationAddresses(donationsData.addresses || [])
      }
      if (locationsRes.ok) {
        const locationsData = await locationsRes.json()
        setSavedLocations(locationsData || [])
      }
      setLinks(data.links || [])
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setGeoLoading(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Unable to get your location. Please allow location access.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleClearLocation = () => {
    setLatitude(null)
    setLongitude(null)
  }

  // Location CRUD
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationForm.name.trim() || !locationForm.location.trim()) return
    setLocationSaving(true)
    try {
      const res = await fetch('/api/users/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationForm.name,
          location: locationForm.location,
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null
        })
      })
      if (res.ok) {
        const newLoc = await res.json()
        setSavedLocations(prev => [...prev, newLoc])
        setLocationForm({ name: '', location: '', latitude: '', longitude: '' })
        setShowLocationForm(false)
        toastSuccess('Location added')
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to add location')
      }
    } catch {
      toastError('Failed to add location')
    } finally {
      setLocationSaving(false)
    }
  }

  const handleSetPrimaryLocation = async (locId: string) => {
    try {
      const res = await fetch(`/api/users/locations/${locId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (res.ok) {
        setSavedLocations(prev => prev.map(l => ({ ...l, isPrimary: l.id === locId })))
        toastSuccess('Primary location updated')
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to update')
      }
    } catch {
      toastError('Failed to update location')
    }
  }

  const handleDeleteLocation = async (locId: string) => {
    if (!confirm('Delete this location?')) return
    try {
      const res = await fetch(`/api/users/locations/${locId}`, { method: 'DELETE' })
      if (res.ok) {
        setSavedLocations(prev => prev.filter(l => l.id !== locId))
        toastSuccess('Location deleted')
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to delete')
      }
    } catch {
      toastError('Failed to delete location')
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, username, bio, location, website, userClass,
          walletAddress, paymentAddress, refundAddress, cryptoCurrency,
          acceptsDonations, neighborhood, searchRadius,
          latitude: latitude ?? null, longitude: longitude ?? null,
          traveling
        })
      })

      if (!res.ok) throw new Error('Failed to update')

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
      fetchData()
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
      fetchData()
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
    return <div style={{padding: '40px', textAlign: 'center'}}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
          <h1>Edit Profile</h1>
          <Link href={getUserProfileUrl(userData || { id: session?.user?.id || '', name: session?.user?.name })} className={styles.editBtn}>
            View Profile
          </Link>
        </div>

        {error && <div className={styles.error || 'error'} style={{padding: '12px', marginBottom: '20px', background: 'rgba(255,51,102,0.1)', border: '1px solid #ff3366', borderRadius: '8px'}}>{error}</div>}

        <form onSubmit={handleSaveProfile}>
          {/* Basic Info */}
          <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px'}}>
            <h2 style={{marginBottom: '20px'}}>Basic Information</h2>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder="username" maxLength={50} style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
              <small style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>Letters and numbers only. Profile URL: xistrymemz.xyz/profile/{username || 'username'}</small>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>User Class</label>
              <select value={userClass} onChange={e => setUserClass(e.target.value)} style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}}>
                <option value="">Select a class</option>
                <option value="Healer">Healer</option>
                <option value="Revealer">Revealer</option>
                <option value="Seer">Seer</option>
                <option value="Teacher">Teacher</option>
                <option value="Guide">Guide</option>
                <option value="Warrior">Warrior</option>
                <option value="Guardian">Guardian</option>
                <option value="Sage">Sage</option>
                <option value="Mystic">Mystic</option>
                <option value="Architect">Architect</option>
                <option value="Artist">Artist</option>
                <option value="Builder">Builder</option>
                <option value="Explorer">Explorer</option>
                <option value="Mentor">Mentor</option>
              </select>
            </div>
          </div>

          {/* Earth Passport */}
          <div style={{background: 'linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 100%)', border: '1px solid #2a4a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px'}}>
            <h2 style={{marginBottom: '8px', color: '#7fff7f'}}>🌍 Earth Passport</h2>
            <p style={{color: '#6a8a6a', fontSize: '0.8rem', marginBottom: '20px'}}>
              Your Earth Passport shows your location on your profile. When <strong>traveling mode</strong> is off, your profile shows <span style={{color: '#00d9ff'}}>📍 Home: [location]</span>. 
              When traveling mode is on, it shows <span style={{color: '#ffc107'}}>✈️ [location] traveling</span> — letting your community know you're on the move.
            </p>

            <div style={{marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
              <label style={{display: 'block', marginBottom: '6px', color: '#88aa88', fontSize: '0.8rem'}}>Profile Display Preview</label>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: traveling ? 'rgba(255, 193, 7, 0.15)' : 'rgba(0, 217, 255, 0.1)', border: traveling ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(0, 217, 255, 0.2)', color: traveling ? '#ffc107' : '#00d9ff'}}>
                  {traveling ? '✈️' : '📍'}
                  <span>{location || 'Your City'}</span>
                  {traveling && <span style={{opacity: 0.6}}>traveling</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setTraveling(!traveling)}
                  style={{padding: '4px 10px', background: 'transparent', border: '1px solid #4ade80', borderRadius: '20px', color: '#4ade80', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600}}
                >
                  Switch to {traveling ? '📍 Home' : '✈️ Traveling'}
                </button>
              </div>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#88aa88'}}>Your Location (City, Country)</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a4a2a', borderRadius: '8px', color: '#c0e0c0'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#88aa88'}}>Neighborhood / Area</label>
              <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Your local neighborhood or district" style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a4a2a', borderRadius: '8px', color: '#c0e0c0'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#88aa88'}}>Search Radius</label>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <input type="range" min="1" max="500" value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} style={{flex: 1, accentColor: '#4ade80'}} />
                <span style={{color: '#7fff7f', fontWeight: 600, minWidth: '50px', textAlign: 'right'}}>{searchRadius}km</span>
              </div>
              <p style={{color: '#6a8a6a', fontSize: '0.75rem', margin: '4px 0 0'}}>Shows listings within this radius when using "Near Me" filters.</p>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: traveling ? '#ffc107' : '#88aa88'}}>
                <input
                  type="checkbox"
                  checked={traveling}
                  onChange={e => setTraveling(e.target.checked)}
                  style={{width: '18px', height: '18px', accentColor: '#ffc107'}}
                />
                <span><strong>I'm currently traveling</strong></span>
              </label>
              <p style={{color: '#6a8a6a', fontSize: '0.75rem', margin: '4px 0 0'}}>
                {traveling
                  ? 'Your profile shows you as traveling. Community members will see you\'re on the move and may reach out to connect.'
                  : 'Your profile shows your home location. Toggle this on when you\'re traveling to let your community know.'}
              </p>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#88aa88'}}>GPS Coordinates</label>
              <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={geoLoading}
                  style={{padding: '8px 16px', background: '#4ade80', color: '#0d1a0d', border: 'none', borderRadius: '8px', cursor: geoLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem'}}
                >
                  {geoLoading ? 'Locating...' : '📍 Auto-Detect'}
                </button>
                {latitude && longitude && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    style={{padding: '8px 16px', background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem'}}
                  >
                    Clear
                  </button>
                )}
              </div>
              {latitude && longitude && (
                <div style={{display: 'flex', gap: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '8px'}}>
                  <div style={{flex: 1}}>
                    <span style={{fontSize: '0.7rem', color: '#6a8a6a'}}>Latitude</span>
                    <div style={{fontFamily: 'monospace', color: '#88bb88', fontSize: '0.875rem'}}>{latitude.toFixed(6)}</div>
                  </div>
                  <div style={{flex: 1}}>
                    <span style={{fontSize: '0.7rem', color: '#6a8a6a'}}>Longitude</span>
                    <div style={{fontFamily: 'monospace', color: '#88bb88', fontSize: '0.875rem'}}>{longitude.toFixed(6)}</div>
                  </div>
                </div>
              )}
              {!latitude && !longitude && (
                <p style={{color: '#6a8a6a', fontSize: '0.8rem', margin: 0, padding: '8px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px'}}>
                  No coordinates set. Coordinates enable distance-based filtering for "Near Me" features. Use the button above to auto-detect, or they'll be derived from your location on save.
                </p>
              )}
            </div>
          </div>

          {/* Saved Locations */}
          <div style={{background: 'linear-gradient(135deg, #1a1a2a 0%, #0d0d1a 100%)', border: '1px solid #2a2a4a', borderRadius: '12px', padding: '24px', marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, color: '#7f7fff'}}>📍 Saved Locations</h2>
              <button
                type="button"
                onClick={() => { setShowLocationForm(true); setLocationForm({ name: '', location: '', latitude: '', longitude: '' }) }}
                style={{padding: '8px 16px', background: '#7f7fff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500}}
              >
                + Add Location
              </button>
            </div>

            {savedLocations.length === 0 && !showLocationForm && (
              <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '0.875rem'}}>
                No saved locations yet. Add places you frequent to help your community find you.
              </p>
            )}

            {savedLocations.map(loc => (
              <div key={loc.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '8px', border: loc.isPrimary ? '1px solid #7f7fff' : '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                    <span style={{fontWeight: 600, fontSize: '0.9rem', color: '#c0c0ff'}}>{loc.name}</span>
                    {loc.isPrimary && <span style={{fontSize: '0.7rem', padding: '2px 8px', background: '#7f7fff', color: '#fff', borderRadius: '10px', fontWeight: 600}}>Primary</span>}
                  </div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{loc.location}</div>
                  {loc.latitude && loc.longitude && (
                    <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px'}}>
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
                <div style={{display: 'flex', gap: '6px'}}>
                  {!loc.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryLocation(loc.id)}
                      style={{padding: '6px 12px', background: 'transparent', border: '1px solid #7f7fff', borderRadius: '6px', color: '#7f7fff', cursor: 'pointer', fontSize: '0.8rem'}}
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(loc.id)}
                    style={{padding: '6px 12px', background: 'transparent', border: '1px solid #ff6b6b', borderRadius: '6px', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem'}}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {showLocationForm && (
              <form onSubmit={handleAddLocation} style={{marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <h3 style={{marginTop: 0, fontSize: '1rem', color: '#c0c0ff'}}>Add New Location</h3>

                <div style={{marginBottom: '12px'}}>
                  <label style={{display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem'}}>Location Name</label>
                  <input
                    type="text"
                    value={locationForm.name}
                    onChange={e => setLocationForm({...locationForm, name: e.target.value})}
                    placeholder="e.g., Home, Office, Favorite Cafe..."
                    required
                    style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem'}}
                  />
                </div>

                <div style={{marginBottom: '12px'}}>
                  <label style={{display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem'}}>Address / Description</label>
                  <input
                    type="text"
                    value={locationForm.location}
                    onChange={e => setLocationForm({...locationForm, location: e.target.value})}
                    placeholder="e.g., 123 Main St, City, Country"
                    required
                    style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem'}}
                  />
                </div>

                <div style={{display: 'flex', gap: '12px', marginBottom: '12px'}}>
                  <div style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem'}}>Latitude (optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={locationForm.latitude}
                      onChange={e => setLocationForm({...locationForm, latitude: e.target.value})}
                      placeholder="51.5074"
                      style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem'}}
                    />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem'}}>Longitude (optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={locationForm.longitude}
                      onChange={e => setLocationForm({...locationForm, longitude: e.target.value})}
                      placeholder="-0.1278"
                      style={{width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem'}}
                    />
                  </div>
                </div>

                <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                  <button
                    type="button"
                    onClick={() => { setShowLocationForm(false); setLocationForm({ name: '', location: '', latitude: '', longitude: '' }) }}
                    style={{padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem'}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={locationSaving}
                    style={{padding: '8px 16px', background: '#7f7fff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'}}
                  >
                    {locationSaving ? 'Saving...' : 'Save Location'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Wallet Addresses - DISABLED until wallet features enabled */}
          <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px', opacity: 0.5, pointerEvents: 'none'}}>
            <h2 style={{marginBottom: '20px'}}>Wallet Addresses <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px'}}>— Coming Soon</span></h2>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Wallet Address</label>
              <input type="text" value={walletAddress} disabled placeholder="0x..." style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Payment Address</label>
              <input type="text" value={paymentAddress} disabled placeholder="0x..." style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Refund Address</label>
              <input type="text" value={refundAddress} disabled placeholder="0x..." style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)'}} />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Default Currency</label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px'}}>
                {allCryptos.map(crypto => (
                  <div
                    key={crypto.id}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.875rem'
                    }}
                  >
                    {crypto.icon && <img src={crypto.icon} alt="" width={16} height={16} style={{borderRadius: '50%'}} />}
                    {crypto.symbol}
                  </div>
                ))}
              </div>
            </div>
          </div>

        <button type="submit" disabled={saving} style={{width: '100%', padding: '14px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem'}}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Donation Settings */}
      <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginTop: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={{margin: 0}}>Donation Addresses</h2>
            <button
              type="button"
              onClick={() => { setShowDonationForm(true); setEditingDonation(null); setDonationForm({ currency: 'ETH', address: '', label: '', showQR: true }) }}
              style={{padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500}}
            >
              + Add Address
            </button>
          </div>

          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={acceptsDonations}
                onChange={e => setAcceptsDonations(e.target.checked)}
                style={{width: '18px', height: '18px', accentColor: 'var(--accent-primary)'}}
              />
              <span>Accept donations on my profile</span>
            </label>
          </div>

          {donationAddresses.length === 0 && !showDonationForm && acceptsDonations && (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '0.875rem'}}>
              No donation addresses yet. Add crypto addresses to receive donations with QR codes.
            </p>
          )}

          {donationAddresses.map(da => {
            const crypto = allCryptos.find(c => c.id === da.currency)
            return (
              <div key={da.id} style={{display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border-color)'}}>
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                    {crypto?.icon && <img src={crypto.icon} alt="" width={20} height={20} style={{borderRadius: '50%'}} />}
                    <span style={{fontWeight: 600, fontSize: '0.9rem'}}>{da.label || crypto?.name || da.currency}</span>
                    {!da.showQR && <span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>(QR hidden)</span>}
                  </div>
                  <code style={{fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all'}}>{da.address}</code>
                </div>
                <div style={{display: 'flex', gap: '6px'}}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDonation(da)
                      setDonationForm({ currency: da.currency, address: da.address, label: da.label || '', showQR: da.showQR })
                      setShowDonationForm(true)
                    }}
                    style={{padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem'}}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteDonation(da.id)}
                    style={{padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.8rem'}}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {showDonationForm && (
            <form onSubmit={handleSaveDonation} style={{marginTop: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)'}}>
              <h3 style={{marginTop: 0, fontSize: '1rem'}}>{editingDonation ? 'Edit Donation Address' : 'Add Donation Address'}</h3>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Currency</label>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px'}}>
                  {allCryptos.map(crypto => (
                    <button
                      key={crypto.id}
                      type="button"
                      onClick={() => setDonationForm({...donationForm, currency: crypto.id})}
                      style={{
                        padding: '6px 10px',
                        background: donationForm.currency === crypto.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: donationForm.currency === crypto.id ? 'var(--bg-primary)' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {crypto.icon && <img src={crypto.icon} alt="" width={14} height={14} style={{borderRadius: '50%'}} />}
                      {crypto.symbol}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>{donationForm.currency} Address</label>
                <input
                  type="text"
                  value={donationForm.address}
                  onChange={e => setDonationForm({...donationForm, address: e.target.value})}
                  placeholder={`Enter your ${donationForm.currency} address...`}
                  required
                  style={{width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem'}}
                />
              </div>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Label (optional)</label>
                <input
                  type="text"
                  value={donationForm.label}
                  onChange={e => setDonationForm({...donationForm, label: e.target.value})}
                  placeholder="e.g., Main Wallet, Cold Storage..."
                  style={{width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem'}}
                />
              </div>

              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem'}}>
                  <input
                    type="checkbox"
                    checked={donationForm.showQR}
                    onChange={e => setDonationForm({...donationForm, showQR: e.target.checked})}
                    style={{accentColor: 'var(--accent-primary)'}}
                  />
                  <span>Show QR code on profile</span>
                </label>
              </div>

              <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={() => { setShowDonationForm(false); setEditingDonation(null) }}
                  style={{padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={donationSaving}
                  style={{padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'}}
                >
                  {donationSaving ? 'Saving...' : (editingDonation ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          )}
        </div>

      {/* Social Links Section */}
      <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginTop: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={{margin: 0}}>Social Links</h2>
            <button
              type="button"
              onClick={() => { setShowLinkForm(true); setEditingLink(null); setLinkForm({ type: 'website', url: '', label: '', icon: '' }) }}
              style={{padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500}}
            >
              + Add Link
            </button>
          </div>

          {links.length === 0 && !showLinkForm && (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '20px'}}>No links added yet. Add your social media and website links!</p>
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
                style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '8px', cursor: 'grab', border: '1px solid var(--border-color)'}}
              >
                <div style={{width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem'}} title="Drag to reorder">
                  ⠿
                </div>
                <div style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'}}>
                  {link.icon ? (
                    <img src={link.icon} alt={socialType.label} width={24} height={24} style={{borderRadius: '4px'}} />
                  ) : socialType.defaultIcon.startsWith('/') ? (
                    <img src={socialType.defaultIcon} alt={socialType.label} width={24} height={24} style={{borderRadius: '4px'}} />
                  ) : (
                    <span>{socialType.defaultIcon}</span>
                  )}
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 500}}>{link.label || socialType.label}</div>
                  <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>{link.url}</div>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLink(link)
                      setLinkForm({ type: link.type, url: link.url, label: link.label || '', icon: link.icon || '' })
                      setShowLinkForm(true)
                    }}
                    style={{padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem'}}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLink(link.id)}
                    style={{padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.875rem'}}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {showLinkForm && (
            <form onSubmit={handleSaveLink} style={{marginTop: '20px', padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '8px'}}>
              <h3 style={{marginTop: 0}}>{editingLink ? 'Edit Link' : 'Add New Link'}</h3>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Link Type</label>
                <select
                  value={linkForm.type}
                  onChange={e => setLinkForm({...linkForm, type: e.target.value})}
                  style={{width: '100%', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)'}}
                >
                  {SOCIAL_TYPES.map(t => (
                    <option key={t.type} value={t.type}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>URL</label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={e => setLinkForm({...linkForm, url: e.target.value})}
                  placeholder="https://..."
                  required
                  style={{width: '100%', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)'}}
                />
              </div>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Label (optional)</label>
                <input
                  type="text"
                  value={linkForm.label}
                  onChange={e => setLinkForm({...linkForm, label: e.target.value})}
                  placeholder="Custom label..."
                  style={{width: '100%', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)'}}
                />
              </div>

              <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Custom Icon URL (optional)</label>
                <input
                  type="url"
                  value={linkForm.icon}
                  onChange={e => setLinkForm({...linkForm, icon: e.target.value})}
                  placeholder="https://example.com/icon.png"
                  style={{width: '100%', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)'}}
                />
                {linkForm.icon && (
                  <div style={{marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Preview:</span>
                    <img src={linkForm.icon} alt="Icon preview" width={20} height={20} style={{borderRadius: '4px'}} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
              </div>

              <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={() => { setShowLinkForm(false); setEditingLink(null) }}
                  style={{padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkSaving}
                  style={{padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500}}
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
