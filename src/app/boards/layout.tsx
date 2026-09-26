import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Boards — XistrYmemZ',
  description: 'Browse community bulletin boards — pin your work where people gather.',
}

export default function BoardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
