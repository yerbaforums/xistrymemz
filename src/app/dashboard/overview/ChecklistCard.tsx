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
}

export default function ChecklistCard({
  hasName, hasBio, postCount, productCount,
  groupCount, connectionCount, hasShop, hasSchool
}: ChecklistProps) {
  const items = [
    { done: hasName && hasBio, label: 'Complete your profile', href: '/profile/edit' },
    { done: postCount > 0, label: 'Make your first post', href: '/dashboard/feed' },
    { done: productCount > 0, label: 'List your first product', href: '/products/new' },
    { done: groupCount > 0, label: 'Join a group', href: '/community/groups' },
    { done: connectionCount > 0, label: 'Connect with someone', href: '/community' },
    { done: hasShop || hasSchool, label: 'Set up Shop or School', href: '/templates' },
  ]

  const doneCount = items.filter(i => i.done).length
  const total = items.length
  const pct = Math.round((doneCount / total) * 100)

  if (doneCount === total) return null

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
            <span className={item.done ? overviewStyles.itemDone : ''}>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
