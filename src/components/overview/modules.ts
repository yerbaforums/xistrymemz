export interface OverviewModuleDef {
  id: string
  title: string
  icon: string
  blurb: string
}

export const OVERVIEW_MODULES: OverviewModuleDef[] = [
  { id: 'attention', title: 'Needs action', icon: '⚡', blurb: 'Appointments, orders, offers, tickets due.' },
  { id: 'stats', title: 'Stats', icon: '📊', blurb: 'Gauges for projects, sales, events.' },
  { id: 'quickActions', title: 'Quick actions', icon: '⚡', blurb: 'One-tap create shortcuts.' },
  { id: 'projects', title: 'Projects', icon: '🚀', blurb: 'Recent projects.' },
  { id: 'feed', title: 'Feed', icon: '📡', blurb: 'Latest posts from you + connections.' },
  { id: 'studio', title: 'Studio items', icon: '🎨', blurb: 'Recent creative output.' },
  { id: 'widgets', title: 'Widgets', icon: '🧩', blurb: 'Boards, invites, progress, people.' },
  { id: 'more', title: 'More stats & tools', icon: '📦', blurb: 'Checklist, achievements, discover.' },
  { id: 'todo', title: 'Quick tasks', icon: '📋', blurb: 'Personal sticky-note todos.' },
]

export const OVERVIEW_PRESETS: Record<string, { label: string; desc: string; visible: string[] }> = {
  full: {
    label: 'Full',
    desc: 'Everything on.',
    visible: ['attention', 'stats', 'quickActions', 'projects', 'feed', 'studio', 'widgets', 'more', 'todo'],
  },
  organizer: {
    label: 'Organizer',
    desc: 'Sell tickets, run events.',
    visible: ['attention', 'stats', 'quickActions', 'feed', 'widgets', 'todo'],
  },
  seller: {
    label: 'Seller',
    desc: 'Sell products, handle orders/offers.',
    visible: ['attention', 'stats', 'quickActions', 'studio', 'widgets', 'todo'],
  },
  teacher: {
    label: 'Teacher',
    desc: 'Courses, school, content.',
    visible: ['attention', 'stats', 'quickActions', 'studio', 'feed', 'todo'],
  },
  minimal: {
    label: 'Minimal',
    desc: 'Just action + tasks.',
    visible: ['attention', 'quickActions', 'todo'],
  },
}
