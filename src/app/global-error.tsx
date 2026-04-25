'use client'

import { useEffect } from 'react'
import Link from 'next/link'

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
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '48px 24px'
    }}>
      <h2 style={{ marginBottom: '16px' }}>Something went wrong</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        An unexpected error occurred.
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
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