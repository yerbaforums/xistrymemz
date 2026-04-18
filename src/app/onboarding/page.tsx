'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

type OnboardingStep = 'welcome' | 'profile' | 'first-plan' | 'community' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [searchRadius, setSearchRadius] = useState('50')
  const [planTitle, setPlanTitle] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

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

  const skipAndGoToDashboard = () => {
    router.push('/dashboard')
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(`/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, location, neighborhood, searchRadius: parseFloat(searchRadius) })
      })
      
      if (!res.ok) {
        throw new Error('Failed to save profile')
      }
      
      nextStep()
    } catch {
      setError('Failed to save profile. You can skip this step.')
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

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: planTitle, 
          description: planDescription,
          status: 'DRAFT'
        })
      })

      if (!res.ok) {
        throw new Error('Failed to create plan')
      }

      nextStep()
    } catch {
      setError('Failed to create plan. You can skip this step.')
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push('/dashboard')
  }

  return (
    <div className={styles.onboarding}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="XistrYmemZ" style={{height: '40px', marginRight: '10px'}} />
            XistrYmemZ
          </div>
          <button onClick={skipAndGoToDashboard} className={styles.skipBtn}>
            Skip for now
          </button>
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
                  <label>Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Neighborhood / Area</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Your neighborhood or area"
                  />
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
                
                <Link href="/requests/public" className={styles.quickLink}>
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
