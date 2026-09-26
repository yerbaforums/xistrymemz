import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projects — XistrYmemZ',
  description: 'Browse community projects — join in, volunteer, or start your own from an open request.',
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
