import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover — XistrYmemZ',
  description: 'Explore services, projects, events, and people near you on the Cosmic Whitepages Cooperative.',
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
