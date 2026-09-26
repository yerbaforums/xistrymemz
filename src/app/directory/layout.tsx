import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Directory — XistrYmemZ',
  description: 'Browse the community phonebook: members, shops, products, services, rentals, events, projects, requests, groups and boards — all in one place.',
}

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
