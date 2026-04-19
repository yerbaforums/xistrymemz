'use client'

import Header from './Header'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  )
}