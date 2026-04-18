import Header from '@/components/Header'
import Link from 'next/link'
import styles from '@/app/dashboard/layout.module.css'

export default async function RequestsLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.container}>
        <nav className="breadcrumbs" style={{ marginBottom: '1rem' }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/requests" className="breadcrumb-link">Requests</Link>
        </nav>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
