import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Learning Center — XistrYmemZ',
  description: 'Browse community lessons and courses — learn a skill or teach your own.',
}

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
