import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shops — XistrYmemZ',
  description: 'Browse community shops — buy direct from local sellers, no platform cuts.',
}

export default function ShopsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
