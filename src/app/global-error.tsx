'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import styles from './global-error.module.css'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Something went wrong</h2>
      <p className={styles.message}>
        An unexpected error occurred.
      </p>
      <div className={styles.actions}>
        <button onClick={reset} className="btn-primary">
          Try Again
        </button>
        <Link href="/" className="btn-secondary">
          Go Home
        </Link>
      </div>
    </div>
  )
}