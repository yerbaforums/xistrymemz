'use client'

import Header from './Header'
import { useActivityPing } from '@/hooks/useActivityPing'

export default function AppShell({ children }: { children: React.ReactNode }) {
  useActivityPing()

  return (
    <>
      <Header />
      <main id="main-content" style={{ paddingTop: 'var(--header-height)' }}>
        {children}
      </main>
    </>
  )
}