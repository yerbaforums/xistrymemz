'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'

export default function NewGroupPage() {
  const router = useRouter()
  const { success, error } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [slugPreview, setSlugPreview] = useState('')
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.user?.id) setAuthenticated(true); else router.push('/auth/login') })
  }, [router])

  useEffect(() => {
    setSlugPreview(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }, [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, privacy: isPrivate ? 'PRIVATE' : 'PUBLIC' })
      })

      if (res.ok) {
        const group = await res.json()
        success('Group created!')
        router.push(`/groups/${group.id}`)
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create group')
      }
    } catch {
      error('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  if (!authenticated) return <div className={styles.loading}><Skeleton width="100%" height="2rem" /></div>

  return (
    <div className={styles.page}>
      <nav className="breadcrumbs">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/groups" className="breadcrumb-link">Groups</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">Create Group</span>
      </nav>

      <div className={styles.formContainer}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <span className={styles.groupIcon}>👥</span>
          </div>
          <h1>Create New Group</h1>
          <p className={styles.subtitle}>Build a community around shared interests, goals, or projects.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.featureCards}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>💬</span>
              <h3>Posts & Discussions</h3>
              <p>Share updates and engage with members</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🛍️</span>
              <h3>Group Buys</h3>
              <p>Pool resources for bulk purchasing deals</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📝</span>
              <h3>Requests</h3>
              <p>Create and link marketplace requests</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🚀</span>
              <h3>Activity Feed</h3>
              <p>Track member projects and contributions</p>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name">Group Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Organic Food Collective"
              maxLength={100}
              required
              className={styles.input}
            />
            <div className={styles.charCount}>{name.length}/100</div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this group about? What will members collaborate on?"
              rows={4}
              maxLength={1000}
              className={styles.textarea}
            />
            <div className={styles.charCount}>{description.length}/1000</div>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <h3>Private Group</h3>
              <p>Only invited members can see content and participate</p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className={styles.toggleInput}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          <div className={styles.actions}>
            <Link href="/groups" className={styles.cancelBtn}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitBtn} disabled={creating || !name.trim()}>
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
