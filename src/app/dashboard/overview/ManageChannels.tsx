'use client'

import Link from 'next/link'
import { useQuickCreate } from '@/components/QuickCreateModal'
import styles from './ManageChannels.module.css'

type Channel = {
  icon: string
  label: string
  desc: string
  manage: string
  tab?: string
}

const CHANNELS: Channel[] = [
  { icon: '✏️', label: 'Feed Posts', desc: 'Your posts, likes, and activity', manage: '/dashboard/feed', tab: 'post' },
  { icon: '📖', label: 'Content Studio', desc: 'Write and publish articles & content', manage: '/dashboard/studio', tab: 'content' },
  { icon: '🛒', label: 'Products & Shop', desc: 'Listings, orders, and shop presence', manage: '/dashboard/marketplace', tab: 'product' },
  { icon: '🔧', label: 'Services', desc: 'Bookable services with availability', manage: '/dashboard/services', tab: 'service' },
  { icon: '🚀', label: 'Projects', desc: 'Goals, milestones, and collaborators', manage: '/dashboard/projects', tab: 'project' },
  { icon: '📝', label: 'Requests', desc: 'Ask the community for help or funding', manage: '/dashboard/requests', tab: 'request' },
  { icon: '📅', label: 'Events', desc: 'Host gatherings, meetups, and classes', manage: '/dashboard/events', tab: 'event' },
  { icon: '👥', label: 'Groups & Forum', desc: 'Connections, groups, and forum posts', manage: '/dashboard/community', tab: 'group' },
  { icon: '🏠', label: 'Rentals', desc: 'Housing, equipment, and spaces', manage: '/dashboard/rentals' },
  { icon: '🎓', label: 'Teaching', desc: 'Courses, content, and students', manage: '/dashboard/teaching' },
  { icon: '🤝', label: 'Deals', desc: 'Offers sent and received', manage: '/dashboard/deals' },
  { icon: '🗓️', label: 'Planner', desc: 'Appointments and your calendar', manage: '/dashboard/appointments' },
  { icon: '📦', label: 'Orders', desc: 'Track purchases and sales', manage: '/orders' },
  { icon: '🏪', label: 'Shop Presence', desc: 'About, banner, and shop slug', manage: '/dashboard/shop' },
  { icon: '🔖', label: 'Saved', desc: 'Items and posts you saved', manage: '/dashboard/saved' },
]

export default function ManageChannels() {
  const { open } = useQuickCreate()

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3>🧭 Manage Your Channels</h3>
        <p>Create and manage everything you share on XistrYmemZ — one hub for all your channels.</p>
      </div>
      <div className={styles.grid}>
        {CHANNELS.map(channel => (
          <div key={channel.label} className={styles.card}>
            <span className={styles.icon} aria-hidden="true">{channel.icon}</span>
            <div className={styles.body}>
              <Link href={channel.manage} className={styles.title}>{channel.label}</Link>
              <p className={styles.desc}>{channel.desc}</p>
              <div className={styles.actions}>
                <Link href={channel.manage} className={styles.manageBtn}>Manage</Link>
                {channel.tab && (
                  <button
                    type="button"
                    className={styles.newBtn}
                    onClick={() => open(channel.tab)}
                  >
                    ＋ New
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}