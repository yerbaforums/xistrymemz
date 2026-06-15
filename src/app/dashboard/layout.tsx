'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SkeletonCard } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import DashboardTourWrapper from '@/components/DashboardTourWrapper'
import { BREADCRUMB_LABELS } from '@/lib/navigation'
import { dashboardShortcuts } from '@/lib/shortcuts'
import styles from './layout.module.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    fetch('/api/users/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.onboardingCompleted === false) {
          if (data?.user?.setupProgress) {
            try {
              const progress = JSON.parse(data.user.setupProgress)
              if (progress.setupDismissed) {
                setOnboardingChecked(true)
                return
              }
            } catch {}
          }
          router.push('/onboarding')
        } else {
          setOnboardingChecked(true)
        }
      })
      .catch(() => setOnboardingChecked(true))
  }, [status, session, router])

  useEffect(() => {
    return dashboardShortcuts((href) => router.push(href))
  }, [router])

  if (status === 'loading' || !onboardingChecked) {
    return (
      <div className={styles.loading}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!session) {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const pageLabel = BREADCRUMB_LABELS[segments[1]] || segments[1]?.replace(/^./, c => c.toUpperCase()) || 'Dashboard'

  return (
    <>
      <div className={styles.main}>
        <nav className={styles.breadcrumbs}>
          <Link href="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
          {pageLabel !== 'Dashboard' && (
            <>
              <span className={styles.breadcrumbSep}> / </span>
              <span className={styles.breadcrumbCurrent}>{pageLabel}</span>
            </>
          )}
        </nav>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      <DashboardTourWrapper />
    </>
  )
}
