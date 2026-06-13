'use client'

import { useState, useEffect, type ReactNode } from 'react'
import overviewStyles from './OverviewCards.module.css'

interface DashboardSectionProps {
  id: string
  title: string
  icon?: string
  defaultMinimized?: boolean
  children: ReactNode
  action?: ReactNode
}

export default function DashboardSection({
  id, title, icon, defaultMinimized = false, children, action
}: DashboardSectionProps) {
  const [minimized, setMinimized] = useState(defaultMinimized)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`dash:${id}`)
      if (saved !== null) setMinimized(saved === 'true')
    } catch {}
  }, [id])

  const toggle = () => {
    const next = !minimized
    setMinimized(next)
    try { localStorage.setItem(`dash:${id}`, String(next)) } catch {}
  }

  return (
    <div className={overviewStyles.sectionOuter}>
      <div
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: minimized ? 'none' : '1px solid var(--border-color)',
          transition: 'var(--transition)',
        }}
      >
        <div className={overviewStyles.sectionHeader}>
          {icon && <span className={overviewStyles.sectionIcon}>{icon}</span>}
          <h3 className={overviewStyles.sectionTitle}>{title}</h3>
        </div>
        <div className={overviewStyles.sectionControls}>
          {action}
          <button
            onClick={(e) => { e.stopPropagation(); toggle() }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '2px 6px',
              transition: 'transform 0.2s',
              transform: minimized ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            ▼
          </button>
        </div>
      </div>
      <div style={{
        maxHeight: minimized ? 0 : 2000,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div className={minimized ? overviewStyles.sectionContent : overviewStyles.sectionExpanded}>
          {children}
        </div>
      </div>
    </div>
  )
}
