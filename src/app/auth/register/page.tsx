'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/page.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteValidating, setInviteValidating] = useState(false)
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteValid(null)
      return
    }
    setInviteValidating(true)
    try {
      const res = await fetch('/api/invite-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      setInviteValid(data.valid)
    } catch {
      setInviteValid(false)
    } finally {
      setInviteValidating(false)
    }
  }

  const handleInviteCodeChange = (code: string) => {
    setInviteCode(code)
    setInviteValid(null)
    if (code.length >= 4) {
      validateInviteCode(code)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode: inviteCode || null })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      if (subscribeNewsletter) {
        fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, source: 'registration' })
        }).catch(() => {})
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Account created but login failed. Please try logging in manually.')
        setLoading(false)
        return
      }

      router.push('/onboarding')
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="XistrYmemZ" style={{height: '40px', marginRight: '10px'}} />
          XistrYmemZ
        </div>

        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Get started with XistrYmemZ</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="inviteCode">Invite Code (optional)</label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => handleInviteCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              className={inviteValid === true ? styles.inputValid : inviteValid === false ? styles.inputError : ''}
            />
            {inviteValidating && <span className={styles.fieldHint}>Validating...</span>}
            {inviteValid && <span className={styles.fieldSuccess}>✓ Valid invite code</span>}
            {inviteValid === false && inviteCode && <span className={styles.fieldError}>Invalid invite code</span>}
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={subscribeNewsletter}
                onChange={(e) => setSubscribeNewsletter(e.target.checked)}
              />
              <span>Subscribe to product updates & announcements</span>
            </label>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchAuth}>
          Already have an account?{' '}
          <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
