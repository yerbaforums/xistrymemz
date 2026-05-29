'use client'

import Link from 'next/link'
import overviewStyles from './OverviewCards.module.css'

interface ChecklistProps {
  hasName: boolean
  hasBio: boolean
  postCount: number
  productCount: number
  groupCount: number
  connectionCount: number
  hasShop: boolean
  hasSchool: boolean
  contentCount?: number
}

const NEXT_STEPS = [
  { label: 'Browse the marketplace', href: '/products', icon: '🛒' },
  { label: 'Explore community members', href: '/community', icon: '👥' },
  { label: 'Create an event', href: '/events/new', icon: '📅' },
  { label: 'Start a discussion in the forum', href: '/community/forum', icon: '💬' },
  { label: 'Set up a courier service', href: '/courier/setup', icon: '🚚' },
  { label: 'Explore project templates', href: '/templates', icon: '📋' },
]

export default function ChecklistCard({
  hasName, hasBio, postCount, productCount,
  groupCount, connectionCount, hasShop, hasSchool,
  contentCount = 0
}: ChecklistProps) {
  const items = [
    { done: hasName && hasBio, label: 'Complete your profile', href: '/profile/edit', desc: 'Add a name and bio' },
    { done: postCount > 0, label: 'Make your first post', href: '/dashboard/feed', desc: 'Share something with the community' },
    { done: productCount > 0, label: 'List your first product', href: '/products/new', desc: 'Start selling or offering services' },
    { done: groupCount > 0, label: 'Join a group', href: '/community/groups', desc: 'Find your people' },
    { done: connectionCount > 0, label: 'Connect with someone', href: '/community', desc: 'Build your network' },
    { done: hasShop || hasSchool, label: 'Set up Shop or School', href: '/templates', desc: 'Create a storefront or course' },
    { done: hasSchool && contentCount > 0, label: 'Create your first school content', href: '/dashboard/teaching', desc: 'Publish a lesson or article' },
  ]

  const doneCount = items.filter(i => i.done).length
  const total = items.length
  const pct = Math.round((doneCount / total) * 100)

  if (doneCount === total) {
    return (
      <div className={overviewStyles.checklistCard}>
        <h3 className={overviewStyles.checklistTitle}>
          🎉 All Set!
          <span className={overviewStyles.checklistProgress}>Complete</span>
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          Want to do more? Here are some next steps:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NEXT_STEPS.slice(0, 4).map((item, i) => (
            <Link key={i} href={item.href} className={overviewStyles.checklistItem}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={overviewStyles.checklistCard}>
      <h3 className={overviewStyles.checklistTitle}>
        🚀 Getting Started
        <span className={overviewStyles.checklistProgress}>{doneCount}/{total}</span>
      </h3>
      <div className={overviewStyles.progressBar}>
        <div className={overviewStyles.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={overviewStyles.checklistItems}>
        {items.map((item, i) => (
          <Link key={i} href={item.href} className={overviewStyles.checklistItem}>
            <span className={item.done ? overviewStyles.checkDone : overviewStyles.checkOpen}>
              {item.done ? '✅' : '○'}
            </span>
            <span>
              <span className={item.done ? overviewStyles.itemDone : ''}>{item.label}</span>
              {!item.done && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {item.desc}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
