'use client'

import Header from './Header'
import NavSidebar from './NavSidebar'
import { useActivityPing } from '@/hooks/useActivityPing'
import { useRecordVisit } from '@/hooks/useRecordVisit'
import styles from './AppShell.module.css'

export default function AppShell({ children }: { children: React.ReactNode }) {
  useActivityPing()
  useRecordVisit()

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        <NavSidebar />
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}