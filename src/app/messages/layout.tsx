import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './layout.module.css'

export default async function MessagesLayout({
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
      <div className={styles.container}>
        <nav className="breadcrumbs" style={{ marginBottom: '1rem' }}>
          <Link href="/messages" className="breadcrumb-link">Messages</Link>
        </nav>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
