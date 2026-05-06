'use client'

import Header from './Header'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content" style={{ paddingTop: 'var(--header-height)' }}>
        {children}
      </main>
    </>
  )
}