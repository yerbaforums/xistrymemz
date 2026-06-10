'use client'

import { useState, useEffect, type ReactNode } from 'react'

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
    <div className="dash-section" style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'var(--transition)',
    }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ fontSize: '1rem' }}>{icon}</span>}
          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <div style={{ padding: minimized ? '0 16px' : '16px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
