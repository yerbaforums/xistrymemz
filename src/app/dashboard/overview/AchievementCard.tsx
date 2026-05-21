'use client'

import { useState, useEffect } from 'react'
import overviewStyles from './OverviewCards.module.css'

const STORAGE_KEY = 'dashboard_achievements_seen'

const ACHIEVEMENTS = [
  { id: 'first_post', label: 'First Post', icon: '✏️', check: (p: number) => p >= 1 },
  { id: 'five_posts', label: '5 Posts', icon: '✍️', check: (p: number) => p >= 5 },
  { id: 'first_connection', label: 'First Connection', icon: '🤝', check: (_: number, c: number) => c >= 1 },
  { id: 'five_connections', label: '5 Connections', icon: '👥', check: (_: number, c: number) => c >= 5 },
  { id: 'first_product', label: 'First Listing', icon: '🛒', check: (_p: number, _c: number, pr: number) => pr >= 1 },
  { id: 'first_project', label: 'First Project', icon: '🚀', check: (_p: number, _c: number, _pr: number, pl: number) => pl >= 1 },
  { id: 'first_group', label: 'Group Member', icon: '👤', check: (_p: number, _c: number, _pr: number, _pl: number, g: number) => g >= 1 },
  { id: 'first_shop', label: 'Shop Owner', icon: '🏪', check: (_p: number, _c: number, _pr: number, _pl: number, _g: number, s: boolean) => s },
  { id: 'first_school', label: 'Teacher', icon: '🏫', check: (_p: number, _c: number, _pr: number, _pl: number, _g: number, _s: boolean, sch: boolean) => sch },
]

interface AchievementCardProps {
  postCount: number
  connectionCount: number
  productCount: number
  planCount: number
  groupCount: number
  hasShop: boolean
  hasSchool: boolean
}

export default function AchievementCard({
  postCount, connectionCount, productCount, planCount,
  groupCount, hasShop, hasSchool
}: AchievementCardProps) {
  const [seen, setSeen] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSeen(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  const earned = ACHIEVEMENTS.filter(a =>
    a.check(postCount, connectionCount, productCount, planCount, groupCount, hasShop, hasSchool)
  )

  const newEarned = earned.filter(a => !seen.has(a.id))

  useEffect(() => {
    if (newEarned.length > 0) {
      const updated = new Set(seen)
      newEarned.forEach(a => updated.add(a.id))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]))
      } catch {}
    }
  }, [newEarned.length])

  if (earned.length === 0) return null

  return (
    <div className={overviewStyles.checklistCard}>
      <h3 className={overviewStyles.checklistTitle}>
        🏆 Milestones
        <span className={overviewStyles.checklistProgress}>{earned.length}/{ACHIEVEMENTS.length}</span>
      </h3>
      <div className={overviewStyles.checklistItems}>
        {earned.map(a => (
          <div key={a.id} className={overviewStyles.checklistItem} style={{ cursor: 'default' }}>
            <span>{a.icon}</span>
            <span>
              <span>{a.label}</span>
              {newEarned.includes(a) && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginLeft: 8 }}>
                  New!
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
