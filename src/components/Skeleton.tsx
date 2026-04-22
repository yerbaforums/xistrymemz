'use client'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export default function Skeleton({ 
  width = '100%', 
  height = '1rem',
  borderRadius = 'var(--radius-sm)',
  className = ''
}: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
      }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card ${className}`}>
      <Skeleton width="60%" height="1.25rem" />
      <Skeleton width="100%" height="1rem" className="mt-2" />
      <Skeleton width="80%" height="0.875rem" className="mt-2" />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4">
          <Skeleton width={48} height={48} borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="40%" height="1rem" />
            <Skeleton width="70%" height="0.875rem" className="mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card">
      <div className="flex gap-4 mb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${100 / cols}%`} height="1rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 mb-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton key={ci} width={`${100 / cols}%`} height="0.875rem" />
          ))}
        </div>
      ))}
    </div>
  )
}