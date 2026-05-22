'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ImageUploader from '@/components/ImageUploader'
import styles from './page.module.css'

type OnboardingStep = 'welcome' | 'profile' | 'tour' | 'community' | 'complete'

const USER_CLASSES = [
  'Healer',
  'Revealer',
  'Seer',
  'Teacher',
  'Guide',
  'Warrior',
  'Guardian',
  'Sage',
  'Mystic',
  'Architect',
  'Artist',
  'Builder',
  'Explorer',
  'Mentor'
]

const CLASS_ICONS: Record<string, string> = {
  Healer: '💚',
  Revealer: '👁️',
  Seer: '🔮',
  Teacher: '📚',
  Guide: '🧭',
  Warrior: '⚔️',
  Guardian: '🛡️',
  Sage: '🦉',
  Mystic: '✨',
  Architect: '🏗️',
  Artist: '🎨',
  Builder: '🔨',
  Explorer: '🌍',
  Mentor: '🌟'
}

const TOUR_OUTLETS = [
  { id: 'marketplace', icon: '🛒', name: 'Marketplace', description: 'Buy, sell, or barter products with the community. List items, accept donations, and make offers.', url: '/dashboard/marketplace' },
  { id: 'projects', icon: '🚀', name: 'Projects', description: 'Organize goals with mileposts, track progress, and collaborate with others on shared plans.', url: '/plans/new' },
  { id: 'community', icon: '🌐', name: 'Community', description: 'Connect with members, join groups, discuss in forums, and build your network.', url: '/dashboard/community' },
  { id: 'requests', icon: '📝', name: 'Requests', description: 'Post tasks you need help with or browse open requests to contribute your skills.', url: '/dashboard/requests' },
  { id: 'events', icon: '📅', name: 'Events', description: 'Discover local events, join gatherings, or create your own events for others.', url: '/events/new' },
  { id: 'rentals', icon: '🏠', name: 'Rentals', description: 'List tools, equipment, and spaces for rent, or find what you need nearby.', url: '/dashboard/rentals' },
  { id: 'shops', icon: '🏪', name: 'Shops', description: 'Open your own shop front with a branded storefront to showcase and sell products.', url: '/shop/setup' },
  { id: 'schools', icon: '📚', name: 'Schools', description: 'Create courses, publish articles and tutorials, or enroll in educational content.', url: '/school/setup' },
  { id: 'offers', icon: '🤝', name: 'Offers & Barter', description: 'Exchange items and services directly through barter offers within the community.', url: '/dashboard/offers' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status, update: updateSession } = useSession()
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarImage, setAvatarImage] = useState('')
  const [location, setLocation] = useState('')
  const [locationName, setLocationName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [searchRadius, setSearchRadius] = useState('50')
  const [userClass, setUserClass] = useState('')
  const [userLocations, setUserLocations] = useState<{id: string; name: string; location: string; isPrimary: boolean}[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationPlace, setNewLocationPlace] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [tourIndex, setTourIndex] = useState(0)
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
  const [acceptsDonations, setAcceptsDonations] = useState(false)
  const [donationAddress, setDonationAddress] = useState('')
  const [donationCurrency, setDonationCurrency] = useState('ETH')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const toggleOutlet = (id: string) => {
    setSelectedOutlets(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    )
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/users/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.onboardingCompleted) {
          router.push('/dashboard')
        } else {
          setName(data?.user?.name || '')
          setBio(data?.user?.bio || '')
          setAvatarImage(data?.user?.image || '')
          setCheckingOnboarding(false)
        }
      })
      .catch(() => setCheckingOnboarding(false))
  }, [status, router])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const completeOnboarding = async () => {
    const res = await fetch('/api/users/onboarding', { method: 'PUT' })
    if (!res.ok) throw new Error('Failed to mark onboarding as complete')
  }

  useEffect(() => {
    if (step === 'profile') {
      fetch('/api/users/locations')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch locations')
          return res.json()
        })
        .then(data => setUserLocations(data || []))
        .catch(() => {})
    }
  }, [step])

  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !newLocationPlace.trim()) return
    setAddingLocation(true)
    try {
      const res = await fetch('/api/users/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName, location: newLocationPlace })
      })
      if (res.ok) {
        const newLoc = await res.json()
        setUserLocations([...userLocations, newLoc])
        setNewLocationName('')
        setNewLocationPlace('')
        if (newLoc.isPrimary) {
          setLocation(newLoc.location)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAddingLocation(false)
    }
  }

  const handleDeleteLocation = async (id: string) => {
    await fetch(`/api/users/locations/${id}`, { method: 'DELETE' })
    setUserLocations(userLocations.filter(l => l.id !== id))
  }

  const handleSetPrimary = async (id: string) => {
    const res = await fetch(`/api/users/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if (res.ok) {
      setUserLocations(userLocations.map(l => ({ ...l, isPrimary: l.id === id })))
      const updated = userLocations.find(l => l.id === id)
      if (updated) setLocation(updated.location)
    }
  }

  const steps: { key: OnboardingStep; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'profile', label: 'Profile' },
    { key: 'tour', label: 'Explore' },
    { key: 'community', label: 'Community' },
    { key: 'complete', label: 'Complete' }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  const nextStep = () => {
    const idx = currentStepIndex
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1].key)
    }
  }

  const prevStep = () => {
    const idx = currentStepIndex
    if (idx > 0) {
      setStep(steps[idx - 1].key)
    }
  }

  const skipAndGoToDashboard = async () => {
    try {
      await completeOnboarding()
      router.push('/dashboard')
    } catch {
      setError('Failed to skip onboarding. Please try again.')
    }
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError('')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    
    try {
      const res = await fetch(`/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, location, neighborhood, searchRadius: parseFloat(searchRadius), userClass, image: avatarImage, acceptsDonations, donationAddress: donationAddress || null, donationCurrency }),
        signal: controller.signal
      })
      
      if (!res.ok) {
        throw new Error('Failed to save profile')
      }

      await updateSession()
      nextStep()
    } catch {
      setError('Failed to save profile. You can skip this step.')
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    try {
      await completeOnboarding()
      if (selectedOutlets.length > 0) {
        const outlet = TOUR_OUTLETS.find(o => o.id === selectedOutlets[0])
        if (outlet) {
          router.push(outlet.url)
          return
        }
      }
      router.push('/dashboard')
    } catch {
      setError('Failed to complete onboarding. Please try again.')
    }
  }

  const sessionUser = session?.user
  const userInitial = (sessionUser?.name || sessionUser?.email || 'U')[0].toUpperCase()
  const displayName = sessionUser?.name?.split(' ')[0] || 'there'
  const userImage = avatarImage || sessionUser?.image || ''

  if (checkingOnboarding || status === 'loading') {
    return (
      <div className={styles.onboarding}>
        <div className={styles.container} style={{ textAlign: 'center', paddingTop: '20vh' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.onboarding}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="XistrYmemZ" style={{height: '40px', marginRight: '10px'}} />
            XistrYmemZ
          </div>
          <div className={styles.headerActions}>
            {currentStepIndex > 0 && currentStepIndex < steps.length - 1 && (
              <button onClick={prevStep} className={styles.backBtn} aria-label="Go back">
                &#8592; Back
              </button>
            )}
            {currentStepIndex < steps.length - 1 && (
              <button onClick={skipAndGoToDashboard} className={styles.skipBtn}>
                Skip for now
              </button>
            )}
            <div className={styles.headerUserBtn} ref={dropdownRef}>
              <button
                className={styles.userBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
              >
                {userImage ? (
                  <Image src={userImage} alt={name || 'User'} width={32} height={32} className={styles.userAvatarImg} />
                ) : (
                  <span className={styles.userInitial}>{userInitial}</span>
                )}
              </button>
              {dropdownOpen && (
                <div className={styles.userDropdown}>
                  <div className={styles.userDropdownInfo}>
                    <strong>{name || sessionUser?.name || 'User'}</strong>
                    <span>{sessionUser?.email}</span>
                  </div>
                  <div className={styles.userDropdownLinks}>
                    <Link href={`/profile/${(sessionUser as any)?.username || ''}`} className={styles.userDropdownLink} onClick={() => setDropdownOpen(false)}>My Profile</Link>
                    <Link href="/dashboard/overview" className={styles.userDropdownLink} onClick={() => setDropdownOpen(false)}>Dashboard</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${((currentStepIndex) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className={styles.stepIndicator}>
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        </div>

        <div className={styles.content}>
          {step === 'welcome' && (
            <div className={styles.stepContent}>
              <div className={styles.welcomeIcon}>🎉</div>
              <h1>Welcome, {displayName}!</h1>
              <p className={styles.welcomeText}>
                You&apos;re now part of XistrYmemZ — a community marketplace where you can 
                create projects, sell products, teach courses, rent items, and connect 
                with others who share your interests.
              </p>
              <p className={styles.welcomeText}>
                Let&apos;s get you set up in just a few steps.
              </p>
              <div className={styles.actionBtns}>
                <button onClick={nextStep} className={styles.primaryBtn}>
                  Let&apos;s Go
                </button>
                <button onClick={skipAndGoToDashboard} className={styles.secondaryBtn}>
                  I&apos;ll explore on my own
                </button>
              </div>
            </div>
          )}

          {step === 'profile' && (
            <div className={styles.stepContent}>
              <h2>Set Up Your Profile</h2>
              <p>Add a photo and some details so others can get to know you.</p>
              
              {error && <div className={styles.error}>{error}</div>}
              
              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Profile Photo</label>
                  <ImageUploader images={avatarImage ? [avatarImage] : []} onChange={urls => setAvatarImage(urls[0] || '')} maxImages={1} />
                </div>

                <div className={styles.formGroup}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>My Locations</label>
                  {userLocations.length > 0 && (
                    <div className={styles.locationsList}>
                      {userLocations.map(loc => (
                        <div key={loc.id} className={styles.locationItem}>
                          <div className={styles.locationInfo}>
                            <strong>{loc.name}</strong>
                            <span>{loc.location}</span>
                          </div>
                          <div className={styles.locationActions}>
                            {loc.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                            {!loc.isPrimary && (
                              <>
                                <button type="button" onClick={() => handleSetPrimary(loc.id)} className={styles.smallBtn}>Set Primary</button>
                                <button type="button" onClick={() => handleDeleteLocation(loc.id)} className={styles.smallBtnDanger}>✕</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.addLocationForm}>
                    <input
                      type="text"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Name (e.g., My Hometown)"
                    />
                    <input
                      type="text"
                      value={newLocationPlace}
                      onChange={(e) => setNewLocationPlace(e.target.value)}
                      placeholder="City, Country"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddLocation}
                      disabled={addingLocation || !newLocationName.trim() || !newLocationPlace.trim()}
                      className={styles.smallBtn}
                    >
                      {addingLocation ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Search Radius (miles)</label>
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                  >
                    <option value="10">10 miles</option>
                    <option value="25">25 miles</option>
                    <option value="50">50 miles</option>
                    <option value="100">100 miles</option>
                    <option value="250">250 miles</option>
                    <option value="500">500 miles</option>
                    <option value="9999">Any distance</option>
                  </select>
                  <p className={styles.formHint}>Filter out posts that are too far away</p>
                </div>

                <div className={styles.formGroup}>
                  <label>Account Type (select multiple)</label>
                  <div className={styles.classGrid}>
                    {USER_CLASSES.map(cls => (
                      <label key={cls} className={styles.classOption}>
                        <input
                          type="checkbox"
                          checked={userClass.split(',').map(c => c.trim()).includes(cls)}
                          onChange={(e) => {
                            const classes = userClass.split(',').map(c => c.trim()).filter(Boolean)
                            if (e.target.checked) {
                              if (!classes.includes(cls)) classes.push(cls)
                            } else {
                              const idx = classes.indexOf(cls)
                              if (idx > -1) classes.splice(idx, 1)
                            }
                            setUserClass(classes.join(', '))
                          }}
                        />
                        <span>{CLASS_ICONS[cls] || ''} {cls}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={acceptsDonations}
                      onChange={e => setAcceptsDonations(e.target.checked)}
                    />
                    <span>Accept donations on my profile</span>
                  </label>
                </div>

                {acceptsDonations && (
                  <div className={styles.formGroup}>
                    <label>Donation Address</label>
                    <div className={styles.donationRow}>
                      <select
                        value={donationCurrency}
                        onChange={e => setDonationCurrency(e.target.value)}
                        className={styles.currencySelect}
                      >
                        <option value="ETH">ETH</option>
                        <option value="BTC">BTC</option>
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="XMR">XMR</option>
                        <option value="XTM">XTM</option>
                        <option value="ARRR">ARRR</option>
                        <option value="DERO">DERO</option>
                        <option value="ZANO">ZANO</option>
                      </select>
                      <input
                        type="text"
                        value={donationAddress}
                        onChange={e => setDonationAddress(e.target.value)}
                        placeholder="Enter your donation address"
                        className={styles.donationInput}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className={styles.actionBtns}>
                <button onClick={handleSaveProfile} className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Continue'}
                </button>
                <button onClick={nextStep} className={styles.secondaryBtn}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'tour' && (
            <div className={styles.stepContent}>
              <h2>Explore XistrYmemZ</h2>
              <p>Browse what you can do here. Select the ones you want to start right away.</p>

              <div className={styles.tourOutletGrid}>
                {TOUR_OUTLETS.map((outlet, i) => {
                  const isSelected = selectedOutlets.includes(outlet.id)
                  return (
                    <div
                      key={outlet.id}
                      className={`${styles.tourOutletCard} ${i === tourIndex ? styles.tourOutletActive : ''} ${isSelected ? styles.tourOutletSelected : ''}`}
                      onClick={() => { setTourIndex(i); toggleOutlet(outlet.id) }}
                    >
                      <span className={styles.tourOutletIcon}>{outlet.icon}</span>
                      <span className={styles.tourOutletName}>{outlet.name}</span>
                      {isSelected && <span className={styles.tourOutletCheck}>✓</span>}
                    </div>
                  )
                })}
              </div>

              <div className={styles.tourCard}>
                <div className={styles.tourIcon}>{TOUR_OUTLETS[tourIndex].icon}</div>
                <h3 className={styles.tourName}>{TOUR_OUTLETS[tourIndex].name}</h3>
                <p className={styles.tourDesc}>{TOUR_OUTLETS[tourIndex].description}</p>
                <button
                  className={styles.quickStartBtn}
                  onClick={() => toggleOutlet(TOUR_OUTLETS[tourIndex].id)}
                >
                  {selectedOutlets.includes(TOUR_OUTLETS[tourIndex].id)
                    ? '✓ Selected — Will Start Here'
                    : '🚀 Quick Start This'}
                </button>
              </div>

              {selectedOutlets.length > 0 && (
                <p className={styles.selectedSummary}>
                  You selected {selectedOutlets.length} {selectedOutlets.length === 1 ? 'outlet' : 'outlets'} to start. 
                  We&apos;ll take you to the first one after setup.
                </p>
              )}

              <div className={styles.tourNav}>
                <button
                  onClick={() => setTourIndex(Math.max(0, tourIndex - 1))}
                  disabled={tourIndex === 0}
                  className={styles.tourNavBtn}
                >
                  &#8592; Previous
                </button>
                <span className={styles.tourCounter}>{tourIndex + 1} / {TOUR_OUTLETS.length}</span>
                {tourIndex < TOUR_OUTLETS.length - 1 ? (
                  <button
                    onClick={() => setTourIndex(Math.min(TOUR_OUTLETS.length - 1, tourIndex + 1))}
                    className={styles.tourNavBtn}
                  >
                    Next &#8594;
                  </button>
                ) : (
                  <button onClick={nextStep} className={styles.tourNavBtnPrimary}>
                    Finish Tour &#8594;
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'community' && (
            <div className={styles.stepContent}>
              <h2>Connect with the Community</h2>
              <p>XistrYmemZ is built around people. Find your people and start collaborating.</p>
              
              <div className={styles.quickLinks}>
                <Link href="/community" className={styles.quickLink}>
                  <span className={styles.linkIcon}>👥</span>
                  <div>
                    <strong>Browse Members</strong>
                    <span>Find and connect with people near you</span>
                  </div>
                </Link>
                
                <Link href="/community/groups" className={styles.quickLink}>
                  <span className={styles.linkIcon}>👤</span>
                  <div>
                    <strong>Join Groups</strong>
                    <span>Find groups by interest, location, or purpose</span>
                  </div>
                </Link>

                <Link href="/community/forum" className={styles.quickLink}>
                  <span className={styles.linkIcon}>💬</span>
                  <div>
                    <strong>Discussion Forum</strong>
                    <span>Start conversations and share ideas</span>
                  </div>
                </Link>
                
                <Link href="/dashboard/projects" className={styles.quickLink}>
                  <span className={styles.linkIcon}>📋</span>
                  <div>
                    <strong>Public Projects</strong>
                    <span>Explore projects you can join and contribute to</span>
                  </div>
                </Link>
                
                <Link href="/dashboard/requests" className={styles.quickLink}>
                  <span className={styles.linkIcon}>📝</span>
                  <div>
                    <strong>Open Requests</strong>
                    <span>Find tasks to help with or needs to fill</span>
                  </div>
                </Link>
              </div>
              
              <div className={styles.actionBtns}>
                <button onClick={nextStep} className={styles.primaryBtn}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className={styles.stepContent}>
              <div className={styles.completeIcon}>🚀</div>
              <h2>You&apos;re All Set, {displayName}!</h2>
              <p>
                Your profile is ready and you&apos;re now part of the XistrYmemZ community.
                Here&apos;s where to go from here:
              </p>
              
              <div className={styles.nextSteps}>
                <h3>Recommended Next Steps:</h3>
                <ul>
                  <li>Post something on the <strong>Feed</strong> to introduce yourself</li>
                  <li>Browse the <strong>Marketplace</strong> to find products and services</li>
                  <li>Create a <strong>Project</strong> to organize your goals</li>
                  <li>Explore the <strong>Community</strong> to connect with others</li>
                  <li>Set up a <strong>Shop</strong> or <strong>School</strong> when you&apos;re ready to sell or teach</li>
                </ul>
              </div>
              
              <div className={styles.actionBtns}>
                <button onClick={handleComplete} className={styles.primaryBtn}>
                  Go to Dashboard
                </button>
                <Link href="/community" className={styles.secondaryBtn}>
                  Explore Community
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.stepDots}>
            {steps.map((s, i) => (
              <span 
                key={s.key} 
                className={`${styles.dot} ${i <= currentStepIndex ? styles.dotActive : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
