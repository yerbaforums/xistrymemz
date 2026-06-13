'use client'

import { useState, useEffect } from 'react'
import overviewStyles from './OverviewCards.module.css'

const STORAGE_KEY = 'dashboard_streak'

interface StreakData {
  dates: string[]
  lastVisit: string
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function loadStreak(): StreakData {
  if (typeof window === 'undefined') return { dates: [], lastVisit: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { dates: [], lastVisit: '' }
  } catch {
    return { dates: [], lastVisit: '' }
  }
}

export default function StreakCard({ postCount, connectionCount }: { postCount: number; connectionCount: number }) {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const data = loadStreak()
    const today = getToday()

    if (data.lastVisit !== today) {
      data.dates.push(today)
      if (data.dates.length > 30) data.dates.shift()
      data.lastVisit = today
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {}
    }

    let count = 0
    const d = new Date()
    for (let i = data.dates.length - 1; i >= 0; i--) {
      const expected = new Date(d)
      expected.setDate(expected.getDate() - (data.dates.length - 1 - i))
      const expectedStr = expected.toISOString().split('T')[0]
      if (data.dates[i] === expectedStr) {
        count++
      } else {
        break
      }
    }
    setStreak(count)
  }, [])

  return (
    <div className={`${overviewStyles.tipCard} ${overviewStyles.streakTip}`}>
      <span className={overviewStyles.streakIcon}>🔥</span>
      <div className={overviewStyles.streakContent}>
        <strong className={overviewStyles.streakLabel}>{streak > 0 ? `${streak}-day streak` : 'Start your streak'}</strong>
        <span className={overviewStyles.streakSub}>
          {postCount > 0 ? `${postCount} posts` : 'No posts yet'} · {connectionCount > 0 ? `${connectionCount} connections` : 'No connections yet'}
        </span>
      </div>
    </div>
  )
}
