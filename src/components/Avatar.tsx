'use client'

import { useState } from 'react'
import IpfsImage from './IpfsImage'
import { snapThumbWidth } from '@/lib/ipfs-gateway'

interface AvatarProps {
  src?: string | null
  name?: string | null
  /** Diameter in px. Defaults to 32. */
  size?: number
  className?: string
  /** Defaults to true (circle). Pass false for rounded-square avatars. */
  rounded?: boolean
}

/**
 * Shared avatar with a safe fallback: renders the image when a valid src is
 * provided, otherwise (or when every gateway fails) shows the first letter
 * of the name on an accent chip. Images load through the shared IPFS gateway
 * chain at retina-scaled thumbnail size.
 */
export default function Avatar({ src, name, size = 32, className, rounded = true }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?'
  const radius = rounded ? '50%' : 8

  if (src && !failed) {
    return (
      <span
        className={className}
        style={{ width: size, height: size, borderRadius: radius, display: 'inline-flex', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)' }}
        aria-hidden="true"
      >
        <IpfsImage
          src={src}
          alt=""
          width={size}
          height={size}
          thumbWidth={snapThumbWidth(Math.max(size * 2, 64))}
          onExhausted={() => setFailed(true)}
        />
      </span>
    )
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)',
        color: 'var(--accent-primary)',
        fontSize: Math.max(10, Math.round(size * 0.4)),
        fontWeight: 600,
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-label={name || 'User'}
      role="img"
    >
      {initial}
    </span>
  )
}