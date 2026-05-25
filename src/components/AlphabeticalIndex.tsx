'use client'

import { useMemo } from 'react'
import styles from './AlphabeticalIndex.module.css'

export interface IndexItem {
  id: string
  label: string
  sortKey?: string
  category?: string
}

interface Props {
  items: IndexItem[]
  renderCard: (item: IndexItem) => React.ReactNode
  groupBy?: (item: IndexItem) => string
  sidebarTitle?: string
}

const LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function getFirstLetter(label: string): string {
  const c = label.trim().toUpperCase()[0] || '#'
  return /[A-Z]/.test(c) ? c : '#'
}

export default function AlphabeticalIndex({ items, renderCard, groupBy, sidebarTitle }: Props) {
  const hasGroupBy = !!groupBy

  const grouped = useMemo(() => {
    const map = new Map<string, IndexItem[]>()
    for (const item of items) {
      const key = groupBy ? groupBy(item) : getFirstLetter(item.sortKey || item.label)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === '#') return -1
      if (b === '#') return 1
      return a.localeCompare(b)
    })
    return sorted
  }, [items, groupBy])

  const letterCounts = useMemo(() => {
    if (hasGroupBy) {
      const counts = new Map<string, number>()
      for (const [, groupItems] of grouped) {
        const label = groupItems[0].category
        const ch = label ? getFirstLetter(label) : '#'
        counts.set(ch, (counts.get(ch) || 0) + groupItems.length)
      }
      return counts
    }
    const counts = new Map<string, number>()
    for (const item of items) {
      const ch = getFirstLetter(item.sortKey || item.label)
      counts.set(ch, (counts.get(ch) || 0) + 1)
    }
    return counts
  }, [items, grouped, hasGroupBy])

  const navKeys = useMemo(() => {
    if (hasGroupBy) return grouped.map(([key]) => key)
    return LETTERS
  }, [grouped, hasGroupBy])

  const scrollTo = (key: string) => {
    const el = document.getElementById(`alpha-${CSS.escape(key)}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarTitle}>{sidebarTitle || 'Browse by Letter'}</div>
        <div className={styles.letterBar}>
          {navKeys.map(key => {
            const ch = getFirstLetter(key)
            const count = letterCounts.get(ch) || 0
            return (
              <button
                key={key}
                className={styles.letterBtn}
                onClick={() => scrollTo(key)}
              >
                <span>{key.length <= 2 ? key : key.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 3)}</span>
                {count > 0 && <span className={styles.letterCount}>{count}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      <div className={styles.content}>
        {grouped.map(([key, letterItems]) => (
          <section key={key} id={`alpha-${CSS.escape(key)}`} className={styles.letterSection}>
            <h2 className={styles.letterHeader}>{key}</h2>
            <div className={styles.letterGrid}>
              {letterItems.map(item => renderCard(item))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
