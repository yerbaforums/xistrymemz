'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ maxWidth: 480 }}>
        <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>💥</span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 2rem' }}>
          {error?.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px', background: 'var(--accent-primary)', color: 'var(--bg-primary)',
            border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
