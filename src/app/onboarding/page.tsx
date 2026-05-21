'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

type OnboardingStep = 'welcome' | 'profile' | 'first-plan' | 'community' | 'complete'

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

export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [locationName, setLocationName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [searchRadius, setSearchRadius] = useState('50')
  const [userClass, setUserClass] = useState('')
  const [userLocations, setUserLocations] = useState<{id: string; name: string; location: string; isPrimary: boolean}[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationPlace, setNewLocationPlace] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [planTitle, setPlanTitle] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

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
          setCheckingOnboarding(false)
        }
      })
      .catch(() => setCheckingOnboarding(false))
  }, [status, router])

  const completeOnboarding = async () => {
    await fetch('/api/users/onboarding', { method: 'PUT' }).catch(() => {})
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
    { key: 'first-plan', label: 'First Plan' },
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
    await completeOnboarding()
    router.push('/dashboard')
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
        body: JSON.stringify({ name, bio, location, neighborhood, searchRadius: parseFloat(searchRadius), userClass }),
        signal: controller.signal
      })
      
      if (!res.ok) {
        throw new Error('Failed to save profile')
      }
      
      nextStep()
    } catch {
      setError('Failed to save profile. You can skip this step.')
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  const handleCreatePlan = async () => {
    if (!planTitle.trim()) {
      setError('Please enter a plan title')
      return
    }

    setLoading(true)
    setError('')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: planTitle, 
          description: planDescription
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        throw new Error('Failed to create plan')
      }

      nextStep()
    } catch {
      setError('Failed to create plan. You can skip this step.')
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    await completeOnboarding()
    router.push('/dashboard')
  }

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
            {currentStepIndex > 0 && (
              <button onClick={prevStep} className={styles.backBtn} aria-label="Go back">
                &#8592; Back
              </button>
            )}
            <button onClick={skipAndGoToDashboard} className={styles.skipBtn}>
              Skip for now
            </button>
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
              <h1>Welcome to XistrYmemZ!</h1>
              <p className={styles.welcomeText}>
                You&apos;re now part of a community where you can create plans, 
                collaborate with others, and bring your ideas to life.
              </p>
              <p className={styles.welcomeText}>
                Let&apos;s get you set up. This quick tour will help you start posting 
                and connecting with the community.
              </p>
              <div className={styles.actionBtns}>
                <button onClick={nextStep} className={styles.primaryBtn}>
                  Get Started
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
              <p>Help others get to know you by adding some details to your profile.</p>
              
              {error && <div className={styles.error}>{error}</div>}
              
              <div className={styles.form}>
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

          {step === 'first-plan' && (
            <div className={styles.stepContent}>
              <h2>Create Your First Project</h2>
              <p>Projects help you organize goals and track progress. Create your first one now!</p>
              
              {error && <div className={styles.error}>{error}</div>}
              
              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Project Title</label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="What do you want to accomplish?"
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Description (optional)</label>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Add more details about your project..."
                    rows={4}
                  />
                </div>
              </div>
              
              <div className={styles.actionBtns}>
                <button onClick={handleCreatePlan} className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
                <button onClick={nextStep} className={styles.secondaryBtn}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'community' && (
            <div className={styles.stepContent}>
              <h2>Join the Community</h2>
              <p>Connect with others, browse public projects, and start collaborating!</p>
              
              <div className={styles.quickLinks}>
                <Link href="/community" className={styles.quickLink}>
                  <span className={styles.linkIcon}>👥</span>
                  <div>
                    <strong>Browse Members</strong>
                    <span>Find and connect with others</span>
                  </div>
                </Link>
                
                <Link href="/plans/public" className={styles.quickLink}>
                  <span className={styles.linkIcon}>📋</span>
                  <div>
                    <strong>Public Projects</strong>
                    <span>Explore projects you can join</span>
                  </div>
                </Link>
                
                <Link href="/requests" className={styles.quickLink}>
                  <span className={styles.linkIcon}>📝</span>
                  <div>
                    <strong>Open Requests</strong>
                    <span>Find tasks to help with</span>
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
              <h2>You&apos;re All Set!</h2>
              <p>
                Your account is ready. Start creating plans, connecting with others, 
                and making things happen!
              </p>
              
              <div className={styles.nextSteps}>
                <h3>Quick Tips:</h3>
                <ul>
                  <li>Create detailed plans with clear goals</li>
                  <li>Submit requests with full context</li>
                  <li>Browse the community and make connections</li>
                  <li>Set up your shop or school when ready</li>
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
