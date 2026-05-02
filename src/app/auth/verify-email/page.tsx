'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../login/page.module.css'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'idle'>('idle')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (token) {
      verifyToken(token)
    }
  }, [token])

  const verifyToken = async (token: string) => {
    setStatus('verifying')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json()
        setError(data.error || 'Verification failed')
        setStatus('error')
      }
    } catch {
      setError('An error occurred')
      setStatus('error')
    }
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.ok) {
        alert('Verification email sent!')
      } else {
        setError(data.error || 'Failed to send email')
      }
    } catch {
      setError('An error occurred')
    }
  }

  if (status === 'verifying') {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.logo}>
            <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
            XistrYmemZ
          </div>
          <div style={{textAlign: 'center', padding: '40px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
            <h1 className={styles.title}>Verifying...</h1>
            <p className={styles.subtitle}>Please wait while we verify your email.</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.logo}>
            <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
            XistrYmemZ
          </div>
          <div style={{textAlign: 'center', padding: '40px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>✅</div>
            <h1 className={styles.title}>Email Verified!</h1>
            <p className={styles.subtitle}>Your email has been successfully verified.</p>
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

        {status === 'error' ? (
          <>
            <div style={{textAlign: 'center', padding: '20px 0'}}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>❌</div>
              <h1 className={styles.title}>Verification Failed</h1>
              <p className={styles.subtitle}>{error || 'Invalid or expired token'}</p>
            </div>

            <div className={styles.form}>
              <p style={{textAlign: 'center', marginBottom: '20px'}}>Request a new verification email:</p>
              <form onSubmit={handleResend}>
                {error && <div className={styles.error} role="alert">⚠️ {error}</div>}
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
                <button type="submit" className={styles.submitBtn}>
                  Resend Verification Email
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Verify Your Email</h1>
            <p className={styles.subtitle}>Enter your email to receive a verification link</p>

            <div className={styles.form}>
              <form onSubmit={handleResend}>
                {error && <div className={styles.error} role="alert">⚠️ {error}</div>}
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
                <button type="submit" className={styles.submitBtn}>
                  Send Verification Email
                </button>
              </form>
            </div>
          </>
        )}

        <p className={styles.switchAuth}>
          <Link href="/auth/login">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
