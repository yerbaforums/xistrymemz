'use client'

import { useState, useRef, useEffect } from 'react'

interface ApprovalBadgeProps {
  showTooltip?: boolean
  onClick?: () => void
  breakdown?: Record<string, number>
}

export default function ApprovalBadge({ showTooltip = false, onClick, breakdown }: ApprovalBadgeProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        onClick={() => {
          if (showTooltip) setOpen(o => !o)
          onClick?.()
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          color: '#00c853',
          background: 'rgba(0, 200, 83, 0.12)',
          border: '1px solid rgba(0, 200, 83, 0.3)',
          cursor: showTooltip ? 'pointer' : 'default',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}
        title={showTooltip ? undefined : 'Approved'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Approved
      </span>
      {open && breakdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
            zIndex: 50,
            minWidth: 160,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#00c853' }}>Quality Breakdown</div>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  )
}
