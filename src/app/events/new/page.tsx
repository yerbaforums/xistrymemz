import { Suspense } from 'react'
import { EventForm } from './EventForm'
import Loading from '@/components/Loading'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function CreateEventPage() {
  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Create Event' },
      ]} />
      <div className={styles.container}>
        <h1>Create Event</h1>
        <p className={styles.subtitle}>Plan a personal event or create a public event for the community</p>
        <Suspense fallback={<Loading size="medium" />}>
          <EventForm />
        </Suspense>
      </div>
    </div>
  )
}