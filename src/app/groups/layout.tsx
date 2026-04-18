import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import styles from './layout.module.css'

export default async function GroupsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.container}>
        <nav className="breadcrumbs" style={{ marginBottom: '1rem' }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/groups" className="breadcrumb-link">Groups</Link>
        </nav>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
