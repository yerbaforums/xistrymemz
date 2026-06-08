import { Suspense } from 'react'
import { EventForm } from './EventForm'
import Skeleton from '@/components/Skeleton'
import styles from './page.module.css'

export default function CreateEventPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1>Create Event</h1>
        <p className={styles.subtitle}>Plan a personal event or create a public event for the community</p>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Skeleton width="300px" height="1.5rem" /></div>}>
          <EventForm />
        </Suspense>
      </div>
    </div>
  )
}