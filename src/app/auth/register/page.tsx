'use client'

import { Suspense, useEffect, useState } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../login/page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'
import { PASSWORD_MIN_LENGTH } from '@/lib/validation'

const OAUTH_META: Record<string, { label: string; icon: string }> = {
  google: { label: 'Google', icon: '/social-logos/google.svg' },
  github: { label: 'GitHub', icon: '/social-logos/github.svg' },
  discord: { label: 'Discord', icon: '/social-logos/discord.svg' },
  twitter: { label: 'X (Twitter)', icon: '/social-logos/twitter.svg' },
  facebook: { label: 'Facebook', icon: '/social-logos/facebook.svg' },
}

function safeCallbackUrl(raw: string | null): string | null {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return null
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteValidating, setInviteValidating] = useState(false)
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [cooldown, setCooldown] = useState(0)
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

  // Live username availability — a debounced read-only check so a taken
  // username never burns a register attempt (or an auth rate-limit slot).
  useEffect(() => {
    const normalized = username.trim()
    if (!normalized || normalized.length < 3) {
      setUsernameStatus('idle')
      return
    }
    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalized)}`)
        const data = await res.json()
        setUsernameStatus(data.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [username])

  // Rate-limit cooldown — counts down the seconds until the form unlocks.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleOAuthSignUp = async (provider: string) => {
    setOauthLoading(provider)
    try {
      await signIn(provider, { callbackUrl: callbackUrl || '/onboarding' })
    } catch {
      setError(`Failed to sign up with ${provider}. Please try again.`)
      setOauthLoading(null)
    }
  }

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

  // Live password policy checklist — mirrors the server-side passwordSchema
  // in src/lib/validation.ts (min length + lower/upper/digit).
  const pwRules = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
  }
  const passwordEligible = pwRules.length && pwRules.lower && pwRules.upper && pwRules.digit
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      setLoading(false)
      return
    }
    if (!passwordEligible) {
      setPasswordError('Please meet all the password requirements above')
      setLoading(false)
      return
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms and Privacy Policy to create an account.')
      return
    }
    if (username.trim() && usernameStatus === 'taken') {
      setError('That username is already taken — please choose another.')
      return
    }
    if (cooldown > 0) return
    setPasswordError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username: username.toLowerCase().replace(/[^a-z0-9]/g, '') || null, email, password, inviteCode: inviteCode || null })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10)
          setCooldown(retryAfter)
          setError(`Too many attempts — please wait ${retryAfter}s and try again.`)
        } else {
          setError(data.error || 'Registration failed')
        }
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

      // Note: no resend-verification call here — the register route already
      // sends the verification email. The old duplicate call doubled the
      // email and burned an extra auth rate-limit slot per signup.

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Account created but login failed. Please try logging in manually.')
        setLoading(false)
        router.push('/auth/login')
        return
      }

      router.push(callbackUrl || '/onboarding')
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Register' }]} />
      <div className={styles.authContainer}>
        <div className={styles.logo}>
          <Image src="/logo.png" alt="XistrYmemZ" width={40} height={40} style={{marginRight: '10px'}} />
          XistrYmemZ
        </div>

        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Get started with XistrYmemZ</p>

        {!providersLoading && oauthProviders.length > 0 && (
          <>
            <div className={styles.socialLogin}>
              {oauthProviders.map(id => (
                <button
                  key={id}
                  type="button"
                  className={styles.socialBtn}
                  onClick={() => handleOAuthSignUp(id)}
                  disabled={oauthLoading === id}
                >
                  <img src={OAUTH_META[id].icon} alt="" width={20} height={20} className={styles.socialIcon} />
                  {oauthLoading === id ? 'Connecting...' : `Sign up with ${OAUTH_META[id].label}`}
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
            <label htmlFor="name">Display Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              placeholder="username"
              required
              maxLength={50}
              pattern="[a-zA-Z0-9]+"
            />
            <span className={styles.fieldHint} role="status">
              {usernameStatus === 'checking' && 'Checking availability…'}
              {usernameStatus === 'available' && '✓ Username is available'}
              {usernameStatus === 'taken' && '✗ Username is already taken — pick another'}
              {(usernameStatus === 'idle' || !username) && 'Letters and numbers only. This will be your profile URL.'}
            </span>
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
            <div className={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={trackCapsLock}
                onBlur={() => setCapsLock(false)}
                placeholder="Create a password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                aria-describedby="password-rules"
              />
              <button
                type="button"
                className={styles.pwToggle}
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            {capsLock && <span className={styles.capsWarn}>⚠️ Caps Lock is on</span>}
            <ul id="password-rules" className={styles.pwRules}>
              <li className={pwRules.length ? styles.pwRuleOk : ''}>{pwRules.length ? '✓' : '○'} {PASSWORD_MIN_LENGTH}+ characters</li>
              <li className={pwRules.lower ? styles.pwRuleOk : ''}>{pwRules.lower ? '✓' : '○'} Lowercase letter</li>
              <li className={pwRules.upper ? styles.pwRuleOk : ''}>{pwRules.upper ? '✓' : '○'} Uppercase letter</li>
              <li className={pwRules.digit ? styles.pwRuleOk : ''}>{pwRules.digit ? '✓' : '○'} A number</li>
            </ul>
            {passwordEligible && <span className={styles.fieldSuccess}>✓ Password is strong</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={styles.passwordWrap}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (passwordError && e.target.value === password) setPasswordError('')
                }}
                onKeyUp={trackCapsLock}
                onBlur={() => setCapsLock(false)}
                placeholder="Confirm your password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.pwToggle}
                onClick={() => setShowConfirm(s => !s)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
            {capsLock && <span className={styles.capsWarn}>⚠️ Caps Lock is on</span>}
            {passwordsMatch && <span className={styles.fieldSuccess}>✓ Passwords match</span>}
            {confirmPassword && !passwordsMatch && <span className={styles.fieldHint}>Passwords don&apos;t match yet…</span>}
            {passwordError && <span className={styles.fieldError}>{passwordError}</span>}
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

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link></span>
            </label>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={
              loading ||
              cooldown > 0 ||
              usernameStatus === 'taken' ||
              (password.length > 0 && !passwordEligible) ||
              (confirmPassword.length > 0 && password !== confirmPassword)
            }
          >
            {loading ? (
              <span className={styles.loadingContent}>
                <span className={styles.spinner} aria-hidden="true"></span>
                Creating account...
              </span>
            ) : cooldown > 0 ? `Try again in ${cooldown}s` : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchAuth}>
          Already have an account?{' '}
          <Link href={callbackUrl ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/login'}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
