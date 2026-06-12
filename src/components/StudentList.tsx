'use client'

import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/fetch-api'
import styles from './StudentList.module.css'

interface StudentListProps {
  resolvedSlug: string | null
  userId: string
}

export default function StudentList({ resolvedSlug, userId }: StudentListProps) {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resolvedSlug) return
    fetchApi<{ students: any[] }>(`/api/school/students?schoolId=${userId}`)
      .then(({ students: s }) => { setStudents(s || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [resolvedSlug, userId])

  if (loading) return <div className={styles.section}><p>Loading students...</p></div>

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>👥 Enrolled Students ({students.length})</h2>
      </div>
      {students.length === 0 ? (
        <p className={styles.empty}>No students enrolled yet.</p>
      ) : (
        <div className={styles.studentList}>
          {students.map(s => (
            <div key={s.id} className={styles.studentCard}>
              <div className={styles.studentInfo}>
                <span className={styles.studentName}>{s.name || s.username || 'Unknown'}</span>
                <span className={styles.studentMeta}>Enrolled {new Date(s.enrolledAt).toLocaleDateString()}</span>
              </div>
              <div className={styles.studentProgress}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${s.totalProgress > 0 ? (s.completedLessons / s.totalProgress) * 100 : 0}%` }} />
                </div>
                <span className={styles.progressText}>{s.completedLessons}/{s.totalProgress} lessons</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
