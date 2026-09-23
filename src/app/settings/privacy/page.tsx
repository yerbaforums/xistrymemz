'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

interface PrivacySettings {
  showShop: boolean
  showSchool: boolean
  enableTips: boolean
  enableReplies: boolean
  enableLikes: boolean
  showViewCount: boolean
  lookingForCollaborators: boolean
  passportVisibility: 'public' | 'hidden'
  showExactCoords: boolean
}

const PRIVACY_OPTIONS = [
  { id: 'showShop' as const, label: 'Show My Shop', description: 'Display your shop on your profile', icon: '🏪' },
  { id: 'showSchool' as const, label: 'Show My School', description: 'Display your school on your profile', icon: '🏫' },
  { id: 'enableTips' as const, label: 'Enable Tips', description: 'Allow others to send you tips', icon: '💎' },
  { id: 'enableReplies' as const, label: 'Enable Replies', description: 'Allow replies on your content', icon: '💬' },
  { id: 'enableLikes' as const, label: 'Enable Likes', description: 'Allow likes on your content', icon: '❤️' },
  { id: 'showViewCount' as const, label: 'Show View Count', description: 'Display view counts on your content', icon: '👁️' },
  { id: 'lookingForCollaborators' as const, label: 'Looking for Collaborators', description: 'Show you are open to collaboration', icon: '🤝' },
]

export default function PrivacySettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { addToast } = useToast()
  const [settings, setSettings] = useState<PrivacySettings>({
    showShop: true,
    showSchool: true,
    enableTips: true,
    enableReplies: true,
    enableLikes: true,
    showViewCount: true,
    lookingForCollaborators: false,
    passportVisibility: 'public',
    showExactCoords: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setSettings(prev => ({
            ...prev,
            showShop: data.user.showShop ?? true,
            showSchool: data.user.showSchool ?? true,
            enableTips: data.user.enableTips ?? true,
            enableReplies: data.user.enableReplies ?? true,
            enableLikes: data.user.enableLikes ?? true,
            showViewCount: data.user.showViewCount ?? true,
            lookingForCollaborators: data.user.lookingForCollaborators ?? false,
          }))
        }
      })
      .catch(() => {})
    fetch('/api/user/preferences')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const privacy = data?.preferences?.privacy
        if (!privacy) return
        setSettings(prev => ({
          ...prev,
          passportVisibility: privacy.passportVisibility === 'hidden' ? 'hidden' : 'public',
          showExactCoords: privacy.showExactCoords === true,
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!session) {
    router.push('/auth/login')
    return null
  }

  const toggle = async (id: keyof PrivacySettings) => {
    if (id === 'passportVisibility' || id === 'showExactCoords') return
    const next = { ...settings, [id]: !settings[id] }
    setSettings(next)
  }

  const setPassportVisibility = (v: 'public' | 'hidden') => setSettings(prev => ({ ...prev, passportVisibility: v }))
  const setExactCoords = (v: boolean) => setSettings(prev => ({ ...prev, showExactCoords: v }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showShop: settings.showShop,
          showSchool: settings.showSchool,
          enableTips: settings.enableTips,
          enableReplies: settings.enableReplies,
          enableLikes: settings.enableLikes,
          showViewCount: settings.showViewCount,
          lookingForCollaborators: settings.lookingForCollaborators,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      const prefRes = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privacy: {
            passportVisibility: settings.passportVisibility,
            showExactCoords: settings.showExactCoords,
          },
        }),
      })
      if (!prefRes.ok) throw new Error('Failed to save passport visibility')
      addToast?.('Privacy settings saved', 'success')
    } catch (err) {
      addToast?.(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.header}>
        <h1>Privacy Settings</h1>
        <Skeleton width="200px" height="1rem" />
      </div>
    )
  }

  return (
    <div>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Settings', href: '/settings' }, { label: 'Privacy' }]} />
        <h1>Privacy Settings</h1>
        <p>Control your visibility and how others interact with you on the platform</p>
      </div>

      <section className={styles.section}>
        <div className={styles.list}>
          {PRIVACY_OPTIONS.map(opt => (
            <label key={opt.id} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowIcon}>{opt.icon}</span>
                <div>
                  <strong>{opt.label}</strong>
                  <p>{opt.description}</p>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${settings[opt.id] ? styles.toggleOn : ''}`}
                onClick={() => toggle(opt.id)}
                role="switch"
                aria-checked={settings[opt.id]}
                aria-label={opt.label}
              >
                <span className={styles.toggleKnob} />
              </button>
            </label>
          ))}
        </div>
        <div className={styles.list} style={{ marginTop: 16 }}>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowIcon}>🌍</span>
              <div>
                <strong>Passport location</strong>
                <p>Hidden still powers your private discovery, radius and trip planning</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`${styles.toggle} ${settings.passportVisibility === 'public' ? styles.toggleOn : ''}`}
                onClick={() => setPassportVisibility('public')}
                role="switch"
                aria-checked={settings.passportVisibility === 'public'}
                aria-label="Passport public"
              >
                <span className={styles.toggleKnob} />
              </button>
              <span style={{ fontSize: '0.8rem', alignSelf: 'center' }}>
                {settings.passportVisibility === 'public' ? 'Public' : 'Hidden'}
              </span>
              <button type="button" onClick={() => setPassportVisibility(settings.passportVisibility === 'public' ? 'hidden' : 'public')} style={{ fontSize: '0.8rem' }}>
                Toggle
              </button>
            </div>
          </div>
          <label className={styles.row} style={{ opacity: settings.passportVisibility === 'hidden' ? 0.5 : 1 }}>
            <div className={styles.rowInfo}>
              <span className={styles.rowIcon}>📍</span>
              <div>
                <strong>Show exact pin</strong>
                <p>Public city-level by default; opt in to share coordinates</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${settings.showExactCoords ? styles.toggleOn : ''}`}
              onClick={() => setExactCoords(!settings.showExactCoords)}
              disabled={settings.passportVisibility === 'hidden'}
              role="switch"
              aria-checked={settings.showExactCoords}
              aria-label="Show exact pin"
            >
              <span className={styles.toggleKnob} />
            </button>
          </label>
        </div>
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </section>
    </div>
  )
}
