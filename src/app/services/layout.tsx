import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Services — XistrYmemZ',
  description: 'Find and book community services — hire locals, get work done, pay directly.',
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
