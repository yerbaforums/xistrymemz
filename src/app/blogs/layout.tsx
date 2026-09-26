import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stories & Blogs — XistrYmemZ',
  description: 'Read community stories, fiction and blogs — and publish your own.',
}

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
