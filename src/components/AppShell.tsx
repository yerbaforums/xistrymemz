'use client'

import Header from './Header'
import { useActivityPing } from '@/hooks/useActivityPing'
import { useRecordVisit } from '@/hooks/useRecordVisit'

export default function AppShell({ children }: { children: React.ReactNode }) {
  useActivityPing()
  useRecordVisit()

  return (
    <>
      <Header />
      <main id="main-content" style={{ paddingTop: 'var(--header-height)' }}>
        {children}
      </main>
    </>
  )
}