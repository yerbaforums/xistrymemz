'use client'

import { useState, type ReactNode } from 'react'
import styles from './AdvancedSection.module.css'

/**
 * Consistent Simple/Advanced divider for every creator form on the site.
 * Simple fields stay visible; monetization/organization live behind one
 * disclosure so first-time creators aren't overwhelmed.
 */
export default function AdvancedSection({
  children,
  label = 'Advanced settings',
  defaultOpen = false,
}: {
  children: ReactNode
  label?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={styles.toggle}
      >
        <span className={styles.caret}>{open ? '▼' : '▶'}</span> {label}
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </div>
  )
}
