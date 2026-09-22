'use client'

import styles from './BulkBar.module.css'

export interface BulkAction {
  label: string
  icon?: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  title?: string
}

interface BulkBarProps {
  count: number
  actions: BulkAction[]
  onClear: () => void
}

/**
 * Shared bulk-selection action bar. Rendered once any rows are selected;
 * the host page owns selection state and passes concrete actions
 * (e.g. Publish / Hide / Delete) plus a clear handler.
 */
export default function BulkBar({ count, actions, onClear }: BulkBarProps) {
  if (count === 0) return null

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <span className={styles.count}>
        {count} selected
      </span>
      <div className={styles.actions}>
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            className={`${styles.btn} ${action.danger ? styles.danger : ''}`}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
          >
            {action.icon && <span aria-hidden="true">{action.icon}</span>}
            {action.label}
          </button>
        ))}
        <button type="button" className={styles.btn} onClick={onClear}>
          Deselect
        </button>
      </div>
    </div>
  )
}