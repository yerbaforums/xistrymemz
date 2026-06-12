'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import styles from './SchoolProgressWidget.module.css'

export default function SchoolProgressWidget() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [schoolData, setSchoolData] = useState<{
    hasSchool: boolean
    schoolSlug: string | null
    studentCount: number
    enrollmentCount: number
    progress: { totalLessons: number; completedLessons: number; completionPct: number } | null
  } | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return
    Promise.all([
      fetch('/api/shop').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/school/enrollments?userId=${session.user.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([shopData, enrollData]) => {
      setSchoolData({
        hasSchool: !!(shopData as any)?.schoolSlug,
        schoolSlug: (shopData as any)?.schoolSlug || null,
        studentCount: (enrollData as any)?.total || 0,
        enrollmentCount: (enrollData as any)?.enrollments?.length || 0,
        progress: (enrollData as any)?.progress || null,
      })
      setLoading(false)
    })
  }, [session?.user?.id])

  if (loading) return null
  if (!schoolData || (!schoolData.hasSchool && schoolData.enrollmentCount === 0)) return null

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.icon}>🏫</span>
        <span className={styles.title}>School</span>
        <Link href={schoolData.hasSchool ? `/school/${schoolData.schoolSlug}` : '/schools'} className={styles.action}>
          {schoolData.hasSchool ? 'Manage →' : 'Browse →'}
        </Link>
      </div>
      {schoolData.hasSchool ? (
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{schoolData.studentCount}</span>
            <span className={styles.statLabel}>Students</span>
          </div>
        </div>
      ) : schoolData.progress && (
        <div className={styles.progressRow}>
          <div className={styles.progressHeader}>Course Progress</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${schoolData.progress.completionPct}%` }} />
          </div>
          <span className={styles.progressText}>{schoolData.progress.completedLessons}/{schoolData.progress.totalLessons} lessons</span>
        </div>
      )}
    </div>
  )
}
