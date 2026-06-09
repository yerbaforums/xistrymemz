'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

interface BackupRecord {
  id: string
  cid: string
  magnetLink: string
  torrentFile: string
  fileName: string
  fileSize: number
  dbSize: number
  createdById: string
  createdBy: { name: string | null; email: string | null } | null
  createdAt: string
}

interface BackupStats {
  totalBackups: number
  totalSize: number
  diskUsage: number
  lastBackupAt: string | null
  autoBackupEnabled: boolean
  backupIntervalHours: number
  backupRetentionCount: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminBackupsPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState('')
  const [autoBackup, setAutoBackup] = useState(false)
  const [intervalHours, setIntervalHours] = useState(24)
  const [retentionCount, setRetentionCount] = useState(7)

  const fetchData = useCallback(async () => {
    try {
      const [backupsRes, statsRes] = await Promise.all([
        fetch('/api/admin/backup'),
        fetch('/api/admin/backup?mode=stats'),
      ])

      if (backupsRes.ok) {
        const data = await backupsRes.json()
        setBackups(data.backups || [])
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
        setAutoBackup(data.autoBackupEnabled)
        setIntervalHours(data.backupIntervalHours)
        setRetentionCount(data.backupRetentionCount)
      }
    } catch {
      setError('Failed to load backup data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateBackup = async () => {
    setCreating(true)
    setCreateProgress('Dumping database...')
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' })
      if (res.ok) {
        setCreateProgress('Backup created successfully!')
        await fetchData()
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to create backup')
      }
    } catch {
      setError('Failed to create backup')
    } finally {
      setTimeout(() => {
        setCreating(false)
        setCreateProgress('')
      }, 2000)
    }
  }

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Delete this backup permanently?')) return
    try {
      const res = await fetch(`/api/admin/backup/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBackups(prev => prev.filter(b => b.id !== id))
      }
    } catch {
      setError('Failed to delete backup')
    }
  }

  const handleToggleAutoBackup = async () => {
    const newVal = !autoBackup
    setAutoBackup(newVal)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableAutoBackup: newVal,
          backupIntervalHours: intervalHours,
          backupRetentionCount: retentionCount,
        }),
      })
    } catch {
      setAutoBackup(!newVal)
    }
  }

  const handleSaveAutoBackupSettings = async () => {
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableAutoBackup: autoBackup,
          backupIntervalHours: intervalHours,
          backupRetentionCount: retentionCount,
        }),
      })
    } catch {
      setError('Failed to save backup settings')
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading backup data...</div>
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Backups' }]} />
      <div className={styles.header}>
        <div>
          <h1>Database Backups</h1>
          <p className={styles.subtitle}>
            Create, download, and manage encrypted database backups with IPFS
            &amp; BitTorrent distribution
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.section}>
        <h2>Storage Overview</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats?.totalBackups || 0}</div>
            <div className={styles.statLabel}>Total Backups</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatBytes(stats?.totalSize || 0)}</div>
            <div className={styles.statLabel}>Total Size</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatBytes(stats?.diskUsage || 0)}</div>
            <div className={styles.statLabel}>Disk Usage</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {stats?.lastBackupAt ? formatDate(stats.lastBackupAt) : 'Never'}
            </div>
            <div className={styles.statLabel}>Last Backup</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Create Backup</h2>
        <p className={styles.description}>
          Manually trigger a full database backup. The dump is compressed with
          gzip, pinned to IPFS, and a magnet link is generated for BitTorrent
          distribution.
        </p>
        <div className={styles.createSection}>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className={`${styles.createBtn} ${creating ? styles.creating : ''}`}
          >
            {creating ? '⏳ Creating...' : '🔄 Create Backup Now'}
          </button>
          {creating && (
            <div className={styles.progressBar}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: createProgress.includes('successfully') ? '100%' : '60%' }}
                />
              </div>
              <div className={styles.progressLabel}>{createProgress}</div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2>Auto-Backup Settings</h2>
        <p className={styles.description}>
          Configure automatic scheduled backups. Requires a cron job or external
          scheduler to hit <code>POST /api/admin/backup</code> at your chosen interval.
        </p>

        <div className={styles.autoBackupRow}>
          <div className={styles.autoBackupInfo}>
            <span className={styles.autoBackupLabel}>Enable Auto-Backup</span>
            <span className={styles.autoBackupDesc}>
              Automatically prune old backups and prepare for scheduled execution
            </span>
          </div>
          <button
            className={`${styles.toggle} ${autoBackup ? styles.active : ''}`}
            onClick={handleToggleAutoBackup}
            aria-pressed={autoBackup}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={styles.optionField}>
            <label className={styles.optionLabel}>Interval (hours)</label>
            <input
              type="number"
              value={intervalHours}
              onChange={e => setIntervalHours(Math.max(1, parseInt(e.target.value) || 1))}
              className={styles.optionInput}
              min={1}
              max={168}
            />
          </div>
          <div className={styles.optionField}>
            <label className={styles.optionLabel}>Retention (backups)</label>
            <input
              type="number"
              value={retentionCount}
              onChange={e => setRetentionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className={styles.optionInput}
              min={1}
              max={100}
            />
          </div>
          <button
            onClick={handleSaveAutoBackupSettings}
            className={styles.actionBtn}
            style={{ padding: '8px 20px' }}
          >
            Save Settings
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Backup History</h2>
        {backups.length === 0 ? (
          <div className={styles.empty}>
            No backups created yet. Click &quot;Create Backup Now&quot; to create your first backup.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>DB Size</th>
                <th>Date</th>
                <th>IPFS CID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.id}>
                  <td className={styles.fileName} title={b.fileName}>
                    {b.fileName.length > 30
                      ? b.fileName.slice(0, 27) + '...'
                      : b.fileName}
                  </td>
                  <td className={styles.fileSize}>{formatBytes(b.fileSize)}</td>
                  <td className={styles.fileSize}>{formatBytes(b.dbSize)}</td>
                  <td className={styles.date}>{formatDate(b.createdAt)}</td>
                  <td>
                    <span className={styles.cid} title={b.cid}>{b.cid}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <a
                        href={`/api/admin/backup/${b.id}`}
                        className={styles.actionBtn}
                      >
                        ⬇ Download
                      </a>
                      <a
                        href={b.magnetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionBtn}
                      >
                        🧲 Magnet
                      </a>
                      <button
                        onClick={() => handleDeleteBackup(b.id)}
                        className={`${styles.actionBtn} ${styles.danger}`}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
