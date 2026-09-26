import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rentals — XistrYmemZ',
  description: 'Browse community rentals — spaces, gear and more, listed by locals.',
}

export default function RentalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
