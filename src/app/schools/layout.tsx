import Link from 'next/link'

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav className="breadcrumbs" style={{ marginBottom: '1rem', padding: '1rem 2rem', background: 'var(--bg-secondary)' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <span>Learning</span>
      </nav>
      {children}
    </>
  )
}
