'use client'

import Link from 'next/link'
import styles from './ErrorPage.module.css'

export default function ErrorPage({ error, reset }: { error?: Error; reset?: () => void }) {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.character} aria-hidden="true">
          🐐🐍
        </div>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.message}>
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className={styles.actions}>
          {reset && (
            <button onClick={reset} className={styles.retryBtn}>
              Try Again
            </button>
          )}
          <Link href="/" className={styles.retryBtn} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
