import { ErrorBoundary } from '@/components/ErrorBoundary'
import styles from './layout.module.css'

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
