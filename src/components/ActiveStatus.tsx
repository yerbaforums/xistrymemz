'use client'

import { useState, useEffect } from 'react'

interface ActiveStatusProps {
  lastActiveAt: string | Date | null | undefined
  showLabel?: boolean
  size?: number
}

function getActiveStatus(ts: string | Date | null | undefined): { label: string; color: string; dot: string } {
  if (!ts) return { label: '', color: 'var(--text-muted)', dot: '⚪' }

  const now = Date.now()
  const then = new Date(ts).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 5) return { label: 'Active now', color: '#22c55e', dot: '🟢' }
  if (diffMin < 60) return { label: `${diffMin}m ago`, color: '#a3e635', dot: '🟡' }
  if (diffMin < 1440) return { label: `${Math.floor(diffMin / 60)}h ago`, color: '#a3e635', dot: '🟡' }
  return { label: '', color: 'var(--text-muted)', dot: '⚪' }
}

export default function ActiveStatus({ lastActiveAt, showLabel = false, size = 10 }: ActiveStatusProps) {
  const [status, setStatus] = useState(() => getActiveStatus(lastActiveAt))

  useEffect(() => {
    setStatus(getActiveStatus(lastActiveAt))
    const interval = setInterval(() => {
      setStatus(getActiveStatus(lastActiveAt))
    }, 30000)
    return () => clearInterval(interval)
  }, [lastActiveAt])

  if (!lastActiveAt) return null

  return (
    <span
      title={status.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.75rem',
        color: status.color,
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: status.color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {showLabel && status.label && <span>{status.label}</span>}
    </span>
  )
}
