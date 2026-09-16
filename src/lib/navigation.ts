export interface NavItem {
  href: string
  icon: string
  label: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export interface SidebarNavItem extends NavItem {
  section: 'primary' | 'secondary'
}

export interface NavConfig {
  main: NavItem[]
  explore: NavItem[]
  community: NavItem[]
  dashboard: NavItem[]
  more: NavItem[]
  admin: NavItem[]
}

export const NAV: NavConfig = {
  main: [
    { href: '/dashboard/overview', icon: '📊', label: 'Overview' },
    { href: '/dashboard/planning', icon: '🗺️', label: 'Planning' },
    { href: '/dashboard/marketplace', icon: '🛒', label: 'Marketplace' },
    { href: '/dashboard/services', icon: '🔧', label: 'Services' },
    { href: '/dashboard/rentals', icon: '🏠', label: 'Rentals' },
    { href: '/dashboard/shop', icon: '🏪', label: 'Shop' },
    { href: '/dashboard/events', icon: '📅', label: 'Events' },
    { href: '/dashboard/appointments', icon: '🗓️', label: 'Planner' },
  ],

  explore: [
    { href: '/discover', icon: '🌐', label: 'Discover' },
    { href: '/boards', icon: '📌', label: 'Boards' },
    { href: '/projects', icon: '🚀', label: 'Projects' },
    { href: '/products', icon: '🛒', label: 'Products' },
    { href: '/services', icon: '🔧', label: 'Services' },
    { href: '/shops', icon: '🏪', label: 'Shops' },
    { href: '/schools', icon: '🏫', label: 'Schools' },
    { href: '/requests', icon: '📝', label: 'Requests' },
    { href: '/events', icon: '📅', label: 'Events' },
    { href: '/rentals', icon: '🏠', label: 'Rentals' },
    { href: '/directory', icon: '📋', label: 'Directory' },
    { href: '/hashtags', icon: '#', label: 'Hashtags' },
  ],

  community: [
    { href: '/community', icon: '👤', label: 'Members' },
    { href: '/community/forum', icon: '💬', label: 'Forum' },
    { href: '/community/groups', icon: '👥', label: 'Groups' },
    { href: '/connections', icon: '🔗', label: 'Connections' },
  ],

  dashboard: [
    { href: '/dashboard/overview', icon: '📊', label: 'Overview' },
    { href: '/dashboard/feed', icon: '📡', label: 'Feed' },
    { href: '/dashboard/deals', icon: '🤝', label: 'My Deals' },
    { href: '/dashboard/projects', icon: '🚀', label: 'My Projects' },
    { href: '/dashboard/requests', icon: '📝', label: 'My Requests' },
    { href: '/dashboard/offers', icon: '💼', label: 'Offers' },
    { href: '/dashboard/services', icon: '🔧', label: 'Services' },
    { href: '/dashboard/rentals', icon: '🏠', label: 'Rentals' },
    { href: '/dashboard/teaching', icon: '🏫', label: 'Teaching' },
    { href: '/dashboard/events', icon: '📅', label: 'Events' },
    { href: '/dashboard/appointments', icon: '🗓️', label: 'Planner' },
    { href: '/dashboard/planning', icon: '🗺️', label: 'Planning' },
    { href: '/dashboard/passport', icon: '🌍', label: 'Passport' },
    { href: '/dashboard/video', icon: '📹', label: 'Video Chat' },
    { href: '/notifications', icon: '🔔', label: 'Notifications' },
    { href: '/dashboard/saved', icon: '⭐', label: 'Saved' },
    { href: '/connections', icon: '🔗', label: 'Connections' },
    { href: '/dashboard/messages', icon: '💬', label: 'Messages' },
    { href: '/courier/setup', icon: '🚚', label: 'Courier' },
    { href: '/templates', icon: '📋', label: 'Templates' },
  ],

  more: [
    { href: '/dashboard/video', icon: '📹', label: 'Video Chat' },
    { href: '/dashboard/offers', icon: '🤝', label: 'Offers' },
    { href: '/dashboard/teaching', icon: '🏫', label: 'Teaching' },
    { href: '/orders', icon: '📦', label: 'Orders' },
    { href: '/notifications', icon: '🔔', label: 'Notifications' },
    { href: '/connections', icon: '🔗', label: 'Connections' },
    { href: '/courier/setup', icon: '🚚', label: 'Courier' },
    { href: '/templates', icon: '📋', label: 'Templates' },
  ],

  admin: [
    { href: '/admin/subscribers', icon: '📧', label: 'Subscribers' },
    { href: '/admin/orders', icon: '📦', label: 'Orders' },
    { href: '/admin/messages', icon: '💬', label: 'Messages' },
    { href: '/admin/invite-codes', icon: '🎟️', label: 'Invite Codes' },
    { href: '/admin/users', icon: '👤', label: 'Users' },
    { href: '/admin/badges', icon: '🏅', label: 'Badges' },
    { href: '/admin/feedback', icon: '📨', label: 'Feedback' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
  ],
}

export const DASHBOARD_SIDEBAR: SidebarNavItem[] = [
  { href: '/dashboard/overview', icon: '📊', label: 'Overview', section: 'primary' },
  { href: '/dashboard/feed', icon: '📡', label: 'Feed', section: 'primary' },
  { href: '/dashboard/deals', icon: '🤝', label: 'My Deals', section: 'primary' },
  { href: '/dashboard/messages', icon: '💬', label: 'Messages', section: 'primary' },
  { href: '/dashboard/passport', icon: '🌍', label: 'Passport', section: 'primary' },
  { href: '/dashboard/events', icon: '📅', label: 'Events', section: 'primary' },
  { href: '/dashboard/appointments', icon: '🗓️', label: 'Planner', section: 'primary' },
  { href: '/dashboard/projects', icon: '🚀', label: 'Projects', section: 'primary' },
  { href: '/dashboard/marketplace', icon: '🛒', label: 'Marketplace', section: 'primary' },
  { href: '/boards', icon: '📌', label: 'Boards', section: 'primary' },
  { href: '/discover', icon: '🌐', label: 'Discover', section: 'primary' },
  { href: '/dashboard/planning', icon: '🗺️', label: 'Planning', section: 'primary' },
  { href: '/dashboard/community', icon: '👥', label: 'Community', section: 'secondary' },
  { href: '/dashboard/requests', icon: '📝', label: 'Requests', section: 'secondary' },
  { href: '/dashboard/services', icon: '🔧', label: 'Services', section: 'secondary' },
  { href: '/dashboard/rentals', icon: '🏠', label: 'Rentals', section: 'secondary' },
  { href: '/dashboard/shop', icon: '🏪', label: 'Shop', section: 'secondary' },
  { href: '/dashboard/teaching', icon: '📚', label: 'Teaching', section: 'secondary' },
  { href: '/dashboard/offers', icon: '🤝', label: 'Offers', section: 'secondary' },
  { href: '/dashboard/saved', icon: '⭐', label: 'Saved', section: 'secondary' },
  { href: '/dashboard/studio', icon: '🎨', label: 'Studio', section: 'secondary' },
  { href: '/directory', icon: '📋', label: 'Directory', section: 'secondary' },
  { href: '/dashboard/video', icon: '📹', label: 'Video Chat', section: 'secondary' },
]

export const BREADCRUMB_LABELS: Record<string, string> = {
  overview: 'Overview',
  deals: 'My Deals',
  studio: 'Studio',
  feed: 'Feed',
  messages: 'Messages',
  community: 'Community',
  projects: 'Projects',
  requests: 'Requests',
  marketplace: 'Marketplace',
  services: 'Services',
  rentals: 'Rentals',
  shop: 'Shop',
  teaching: 'Teaching',
  offers: 'Offers',
  events: 'Events',
  video: 'Video Chat',
  appointments: 'Planner',
  planning: 'Planning',
  passport: 'Passport',
  saved: 'Saved',
}
