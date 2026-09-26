import type { Metadata } from 'next'
import styles from '@/app/dashboard/layout.module.css'

export const metadata: Metadata = {
  title: 'Requests — XistrYmemZ',
  description: 'Browse open community requests — help out, make an offer, or turn one into a project.',
}

export default async function RequestsLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
