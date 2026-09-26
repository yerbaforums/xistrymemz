'use client'

import styles from './error.module.css'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <span className={styles.icon}>💥</span>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.message}>
          {process.env.NODE_ENV === 'development'
            ? (error?.message || 'An unexpected error occurred')
            : 'An unexpected error occurred. Please try again — if it keeps happening, let us know.'}
        </p>
        <button onClick={reset} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    </div>
  )
}
