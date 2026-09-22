'use client'

import { Suspense, useEffect, useState } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

const OAUTH_META: Record<string, { label: string; icon: string }> = {
  google: { label: 'Google', icon: '/social-logos/google.svg' },
  github: { label: 'GitHub', icon: '/social-logos/github.svg' },
  discord: { label: 'Discord', icon: '/social-logos/discord.svg' },
  twitter: { label: 'X (Twitter)', icon: '/social-logos/twitter.svg' },
  facebook: { label: 'Facebook', icon: '/social-logos/facebook.svg' },
}

function safeCallbackUrl(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/dashboard'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [oauthProviders, setOauthProviders] = useState<string[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)

  useEffect(() => {
    getProviders()
      .then(all => {
        const ids = Object.keys(all || {}).filter(id => id !== 'credentials' && OAUTH_META[id])
        setOauthProviders(ids)
      })
      .catch(() => {})
      .finally(() => setProvidersLoading(false))
  }, [])

  const handleOAuthSignIn = async (provider: string) => {
    setOauthLoading(provider)
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setError(`Failed to sign in with ${provider}. Please try again.`)
      setOauthLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        rememberMe,
        redirect: false
      })

      if (result?.error || result?.ok === false) {
        setError('Invalid email or password')
        setLoading(false)
      } else {
        router.push(callbackUrl)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Login' }]} />
      <div className={styles.authContainer}>
        <div className={styles.logo}>
          <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
          XistrYmemZ
        </div>

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        {!providersLoading && oauthProviders.length > 0 && (
          <>
            <div className={styles.socialLogin}>
              {oauthProviders.map(id => (
                <button
                  key={id}
                  type="button"
                  className={styles.socialBtn}
                  onClick={() => handleOAuthSignIn(id)}
                  disabled={oauthLoading === id}
                >
                  <img src={OAUTH_META[id].icon} alt="" width={20} height={20} className={styles.socialIcon} />
                  {oauthLoading === id ? 'Connecting...' : `Sign in with ${OAUTH_META[id].label}`}
                </button>
              ))}
            </div>

            <div className={styles.divider}>
              <span>or continue with email</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
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

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={8}
              aria-describedby="password-hint"
            />
            <span id="password-hint" className={styles.fieldHint}>Minimum 8 characters</span>
          </div>

          <div className={styles.formOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link href="/auth/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className={styles.loadingContent}>
                <span className={styles.spinner} aria-hidden="true"></span>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className={styles.switchAuth}>
          Don&apos;t have an account?{' '}
          <Link href={callbackUrl !== '/dashboard' ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/register'}>Register</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
