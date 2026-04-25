import Link from 'next/link'

export default function NotFound() {
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
      <h1 style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>404</h1>
      <h2 style={{ marginBottom: '16px' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link href="/" className="btn-primary">
        Go Home
      </Link>
    </div>
  )
}