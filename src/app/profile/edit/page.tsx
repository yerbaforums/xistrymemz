'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getAllCryptos, getCryptoIcon, getCryptoName } from '@/lib/crypto-icons'
import styles from '../[username]/profile.module.css'

interface UserLink {
  id: string
  type: string
  url: string
  label?: string | null
  icon?: string | null
  sortOrder: number
}

const SOCIAL_TYPES = [
  { type: 'website', label: 'Website', defaultIcon: '🔗' },
  { type: 'twitter', label: 'Twitter / X', defaultIcon: '/social-logos/twitter.png' },
  { type: 'github', label: 'GitHub', defaultIcon: '/social-logos/github.png' },
  { type: 'instagram', label: 'Instagram', defaultIcon: '/social-logos/instagram.png' },
  { type: 'linkedin', label: 'LinkedIn', defaultIcon: '/social-logos/linkedin.png' },
  { type: 'youtube', label: 'YouTube', defaultIcon: '/social-logos/youtube.png' },
  { type: 'tiktok', label: 'TikTok', defaultIcon: '/social-logos/tiktok.png' },
  { type: 'discord', label: 'Discord', defaultIcon: '/social-logos/discord.png' },
  { type: 'telegram', label: 'Telegram', defaultIcon: '/social-logos/telegram.png' },
  { type: 'custom', label: 'Custom Link', defaultIcon: '🔗' }
]

export default function ProfileEditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Profile fields
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [userClass, setUserClass] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [paymentAddress, setPaymentAddress] = useState('')
  const [refundAddress, setRefundAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState('ETH')

  // Donation fields
  const [donationAddress, setDonationAddress] = useState('')
  const [donationCurrency, setDonationCurrency] = useState('ETH')
  const [acceptsDonations, setAcceptsDonations] = useState(false)

  // Links
  const [links, setLinks] = useState<UserLink[]>([])
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [editingLink, setEditingLink] = useState<UserLink | null>(null)
  const [linkForm, setLinkForm] = useState({ type: 'website', url: '', label: '', icon: '' })
  const [linkSaving, setLinkSaving] = useState(false)

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
      setName(user.name || '')
      setBio(user.bio || '')
      setLocation(user.location || '')
      setWebsite(user.website || '')
      setUserClass(user.userClass || '')
      setWalletAddress(user.walletAddress || '')
      setPaymentAddress(user.paymentAddress || '')
      setRefundAddress(user.refundAddress || '')
      setCryptoCurrency(user.cryptoCurrency || 'ETH')
      setDonationAddress(user.donationAddress || '')
      setDonationCurrency(user.donationCurrency || 'ETH')
      setAcceptsDonations(user.acceptsDonations || false)
      setLinks(data.links || [])
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
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
          name, bio, location, website, userClass,
          walletAddress, paymentAddress, refundAddress, cryptoCurrency,
          donationAddress: acceptsDonations ? donationAddress : null,
          donationCurrency: acceptsDonations ? donationCurrency : 'ETH',
          acceptsDonations
        })
      })

      if (!res.ok) throw new Error('Failed to update')
      alert('Profile updated successfully!')
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
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
    } catch (err) {
      console.error('Error saving link:', err)
      alert('Failed to save link')
    } finally {
      setLinkSaving(false)
    }
  }

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Delete this link?')) return

    try {
      await fetch(`/api/users/links/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (err) {
      console.error('Error deleting link:', err)
    }
  }

  const getSocialType = (type: string) => {
    return SOCIAL_TYPES.find(t => t.type === type) || SOCIAL_TYPES[0]
  }

  if (loading) {
    return <div style={{padding: '40px', textAlign: 'center'}}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
          <h1>Edit Profile</h1>
          <Link href={`/profile/${session?.user?.name?.toLowerCase().replace(/\s+/g, '-') || ''}`} className={styles.editBtn}>
            View Profile
          </Link>
        </div>

        {error && <div className={styles.error || 'error'} style={{padding: '12px', marginBottom: '20px', background: 'rgba(255,51,102,0.1)', border: '1px solid #ff3366', borderRadius: '8px'}}>{error}</div>}

        <form onSubmit={handleSaveProfile}>
          {/* Basic Info */}
          <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px'}}>
            <h2 style={{marginBottom: '20px'}}>Basic Information</h2>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
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

          {/* Wallet Addresses */}
          <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px'}}>
            <h2 style={{marginBottom: '20px'}}>Wallet Addresses</h2>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Wallet Address</label>
              <input type="text" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="0x..." style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Payment Address</label>
              <input type="text" value={paymentAddress} onChange={e => setPaymentAddress(e.target.value)} placeholder="0x..." style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Refund Address</label>
              <input type="text" value={refundAddress} onChange={e => setRefundAddress(e.target.value)} placeholder="0x..." style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}} />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Default Currency</label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px'}}>
                {allCryptos.map(crypto => (
                  <button
                    key={crypto.id}
                    type="button"
                    onClick={() => setCryptoCurrency(crypto.id)}
                    style={{
                      padding: '8px 12px',
                      background: cryptoCurrency === crypto.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: cryptoCurrency === crypto.id ? 'var(--bg-primary)' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.875rem'
                    }}
                  >
                    {crypto.icon && <img src={crypto.icon} alt="" width={16} height={16} style={{borderRadius: '50%'}} />}
                    {crypto.symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Donation Settings */}
          <div style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px'}}>
            <h2 style={{marginBottom: '20px'}}>Donation Settings</h2>

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

            {acceptsDonations && (
              <>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Donation Address</label>
                  <input
                    type="text"
                    value={donationAddress}
                    onChange={e => setDonationAddress(e.target.value)}
                    placeholder="Enter your donation address..."
                    required={acceptsDonations}
                    style={{width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)'}}
                  />
                </div>

                <div>
                  <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Donation Currency</label>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px'}}>
                    {allCryptos.map(crypto => (
                      <button
                        key={crypto.id}
                        type="button"
                        onClick={() => setDonationCurrency(crypto.id)}
                        style={{
                          padding: '8px 12px',
                          background: donationCurrency === crypto.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: donationCurrency === crypto.id ? 'var(--bg-primary)' : 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.875rem'
                        }}
                      >
                        {crypto.icon && <img src={crypto.icon} alt="" width={16} height={16} style={{borderRadius: '50%'}} />}
                        {crypto.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button type="submit" disabled={saving} style={{width: '100%', padding: '14px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem'}}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

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

          {links.map(link => {
            const socialType = getSocialType(link.type)
            return (
              <div key={link.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '8px'}}>
                <div style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'}}>
                  {socialType.defaultIcon.startsWith('/') ? (
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
                    onClick={() => handleDeleteLink(link.id)}
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
    </div>
  )
}
