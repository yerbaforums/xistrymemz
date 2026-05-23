'use client'

import styles from './ViewCount.module.css'

interface ViewCountProps {
  count: number
  size?: 'sm' | 'md'
}

export default function ViewCount({ count, size = 'sm' }: ViewCountProps) {
  if (count === 0) return null
  return (
    <span className={`${styles.viewCount} ${size === 'md' ? styles.md : ''}`}>
      <svg width={size === 'md' ? 16 : 12} height={size === 'md' ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {count}
    </span>
  )
}
