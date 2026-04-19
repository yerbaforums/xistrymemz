import Link from 'next/link'
import styles from './layout.module.css'

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <nav className="breadcrumbs" style={{ marginBottom: '1rem' }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/events" className="breadcrumb-link">Events</Link>
        </nav>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
