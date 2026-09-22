'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, Fragment } from 'react'
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
  // Walk every segment past /dashboard so nested routes (e.g. /dashboard/projects/[id])
  // get correct crumbs instead of a flat second-level label. Object IDs are skipped.
  const crumbs = segments.slice(1)
    .filter(seg => seg.length <= 20)
    .map((seg, i) => ({
      href: `/${segments.slice(1, i + 2).join('/')}`,
      label: BREADCRUMB_LABELS[seg] || seg.replace(/^./, c => c.toUpperCase()),
    }))

  return (
    <>
      <div className={styles.main}>
        <nav className={styles.breadcrumbs}>
          <Link href="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href}>
              <span className={styles.breadcrumbSep}> / </span>
              {i === crumbs.length - 1 ? (
                <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className={styles.breadcrumbLink}>{crumb.label}</Link>
              )}
            </Fragment>
          ))}
        </nav>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      <DashboardTourWrapper />
    </>
  )
}
