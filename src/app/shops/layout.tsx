import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function ShopsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  return (
    <>
      <nav className="breadcrumbs" style={{ marginBottom: '1rem', padding: '1rem 2rem', background: 'var(--bg-secondary)' }}>
        <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span className="breadcrumb-sep">/</span>
        <Link href="/shops" className="breadcrumb-link">Marketplace</Link>
      </nav>
      {children}
    </>
  )
}
