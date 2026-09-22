'use client'

import { useEffect } from 'react'
import { DASHBOARD_SIDEBAR } from '@/lib/navigation'
import styles from './ShortcutHelp.module.css'

const EXTRA_SHORTCUTS = [
  { key: 'Alt + B', label: 'Boards' },
  { key: 'Alt + P', label: 'Passport' },
  { key: 'Alt + D', label: 'Discover' },
  { key: 'Alt + F', label: 'Feed' },
  { key: 'Alt + N', label: 'Overview' },
]

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const primary = DASHBOARD_SIDEBAR.filter(item => item.section === 'primary')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className={styles.hint}>Hold <kbd>Alt</kbd> and press a key to jump anywhere in the dashboard.</p>
        <div className={styles.grid}>
          {primary.map((item, i) => (
            <div key={item.href} className={styles.row}>
              <kbd>Alt + {i + 1}</kbd>
              <span>{item.icon} {item.label}</span>
            </div>
          ))}
          {EXTRA_SHORTCUTS.map(s => (
            <div key={s.key} className={styles.row}>
              <kbd>{s.key}</kbd>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}