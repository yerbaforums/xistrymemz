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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setSettings({
            showShop: data.user.showShop ?? true,
            showSchool: data.user.showSchool ?? true,
            enableTips: data.user.enableTips ?? true,
            enableReplies: data.user.enableReplies ?? true,
            enableLikes: data.user.enableLikes ?? true,
            showViewCount: data.user.showViewCount ?? true,
            lookingForCollaborators: data.user.lookingForCollaborators ?? false,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!session) {
    router.push('/auth/login')
    return null
  }

  const toggle = async (id: keyof PrivacySettings) => {
    const next = { ...settings, [id]: !settings[id] }
    setSettings(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
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
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </section>
    </div>
  )
}
