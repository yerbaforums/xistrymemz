'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { EmptyState } from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'

interface InviteCode {
  id: string
  code: string
  type: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminInviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'BETA', maxUses: 1, expiresAt: '', count: 1 })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchCodes()
  }, [])

  async function fetchCodes() {
    try {
      const res = await fetch('/api/invite-codes')
      if (res.ok) {
        const data = await res.json()
        setCodes(data.codes || [])
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createCodes() {
    setSaving(true)
    try {
      const res = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        const data = await res.json()
        setCodes(prev => [...data.codes, ...prev])
        setShowForm(false)
        setForm({ type: 'BETA', maxUses: 1, expiresAt: '', count: 1 })
      }
    } catch (error) {
      console.error('Failed to create codes:', error)
    } finally {
      setSaving(false)
    }
  }

  async function toggleCode(code: InviteCode) {
    try {
      const res = await fetch('/api/invite-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: code.id, isActive: !code.isActive })
      })
      if (res.ok) {
        setCodes(prev => prev.map(c => c.id === code.id ? { ...c, isActive: !c.isActive } : c))
      }
    } catch (error) {
      console.error('Failed to toggle code:', error)
    }
  }

  async function deleteCode(id: string) {
    if (!confirm('Delete this invite code?')) return
    try {
      const res = await fetch(`/api/invite-codes?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCodes(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete code:', error)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const typeLabels: Record<string, string> = {
    BETA: 'Beta',
    EMAIL_LIST: 'Email List',
    GENERAL: 'General'
  }

  if (loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invite Codes</h1>
          <p className={styles.subtitle}>Manage beta and email list signup codes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={styles.createBtn}>
          {showForm ? 'Cancel' : '+ Create Codes'}
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3>Create New Invite Codes</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="BETA">Beta</option>
                <option value="EMAIL_LIST">Email List</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Expires</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Count</label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.count}
                onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <button onClick={createCodes} disabled={saving} className={styles.generateBtn}>
            {saving ? 'Generating...' : `Generate ${form.count} Code${form.count > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{codes.length}</span>
          <span className={styles.statLabel}>Total Codes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{codes.filter(c => c.isActive).length}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{codes.reduce((sum, c) => sum + c.usedCount, 0)}</span>
          <span className={styles.statLabel}>Total Uses</span>
        </div>
      </div>

      {codes.length === 0 ? (
        <EmptyState icon="🔑" title="No invite codes yet" description="Create some to get started." action={{ label: 'Create Codes', onClick: () => setShowForm(true) }} />
      ) : (
        <div className={styles.codeList}>
          {codes.map(code => (
            <div key={code.id} className={`${styles.codeItem} ${!code.isActive ? styles.inactive : ''}`}>
              <div className={styles.codeInfo}>
                <div className={styles.codeRow}>
                  <code className={styles.code}>{code.code}</code>
                  <button onClick={() => copyCode(code.code)} className={styles.copyBtn}>
                    {copied === code.code ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className={styles.codeMeta}>
                  <span className={styles.codeType}>{typeLabels[code.type] || code.type}</span>
                  <span>{code.usedCount}/{code.maxUses} uses</span>
                  {code.expiresAt && <span>Expires: {formatDate(code.expiresAt)}</span>}
                </div>
              </div>
              <div className={styles.codeActions}>
                <button 
                  onClick={() => toggleCode(code)} 
                  className={code.isActive ? styles.deactivateBtn : styles.activateBtn}
                >
                  {code.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteCode(code.id)} className={styles.deleteBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
