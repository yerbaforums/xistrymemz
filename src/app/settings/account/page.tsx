'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function AccountSettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { addToast } = useToast()

  const [email, setEmail] = useState(session?.user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  if (!session) {
    router.push('/auth/login')
    return null
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update email')
      await update()
      addToast?.('Email updated successfully', 'success')
    } catch (err) {
      addToast?.(err instanceof Error ? err.message : 'Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      addToast?.('Passwords do not match', 'error')
      return
    }
    if (newPassword.length < 6) {
      addToast?.('Password must be at least 6 characters', 'error')
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      addToast?.('Password changed successfully', 'success')
    } catch (err) {
      addToast?.(err instanceof Error ? err.message : 'Failed to change password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Settings', href: '/settings' }, { label: 'Account' }]} />
        <h1>Account Settings</h1>
        <p>Manage your email, password, and account security</p>
      </div>

      <section className={styles.section}>
        <h2>Email Address</h2>
        <form onSubmit={handleEmailChange} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className={styles.saveBtn} disabled={changingPassword}>
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Account Info</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Member Since</span>
            <span className={styles.infoValue}>
              {session.user?.email ? new Date().getFullYear() : '-'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>User ID</span>
            <span className={styles.infoValue}>{session.user?.id?.slice(0, 12)}...</span>
          </div>
        </div>
      </section>
    </div>
  )
}
