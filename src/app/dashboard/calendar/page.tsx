import PlannerCalendar from '../PlannerCalendar'
import Breadcrumbs from '@/components/Breadcrumbs'

export const metadata = {
  title: 'Planner Calendar — XistrYmemZ',
  description: 'Month, week and day views across personal events, appointments, project events, trips and connections.',
}

// Unified planner surface: month/week/day views with per-type filters,
// plus cross-links to the appointments and trip planners.
export default function PlannerCalendarPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Dashboard', href: '/dashboard/overview' },
        { label: 'Planner Calendar' },
      ]} />
      <PlannerCalendar />
    </div>
  )
}
