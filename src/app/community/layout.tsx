import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'Community — XistrYmemZ',
  description: 'Connect with members, join groups, and participate in forums on the Cosmic Whitepages Cooperative.',
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.main}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
