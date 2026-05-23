'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../login/page.module.css'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'An error occurred')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.logo}>
            <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
            XistrYmemZ
          </div>

          <div style={{textAlign: 'center', padding: '40px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
            <h1 className={styles.title}>Invalid Link</h1>
            <p className={styles.subtitle}>
              This password reset link is invalid or has expired.
            </p>
            <Link href="/auth/forgot-password" className={styles.submitBtn} style={{display: 'inline-block', textDecoration: 'none', marginTop: '20px'}}>
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.logo}>
            <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
            XistrYmemZ
          </div>

          <div style={{textAlign: 'center', padding: '40px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>✅</div>
            <h1 className={styles.title}>Password Reset!</h1>
            <p className={styles.subtitle}>
              Your password has been successfully reset.
            </p>
            <Link href="/auth/login" className={styles.submitBtn} style={{display: 'inline-block', textDecoration: 'none', marginTop: '20px'}}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.logo}>
          <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
          XistrYmemZ
        </div>

        <h1 className={styles.title}>Set New Password</h1>
        <p className={styles.subtitle}>Enter your new password below</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error} role="alert">⚠️ {error}</div>}
          
          <div className={styles.formGroup}>
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={8}
            />
            <span className={styles.fieldHint}>Minimum 8 characters</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
