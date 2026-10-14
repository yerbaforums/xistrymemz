'use client'

import { useEffect, useState } from 'react'
import { imageCandidates, loadWithTimeout } from '@/lib/ipfs-gateway'

interface IpfsCoverProps {
  /** Cover image URL (IPFS gateway or any URL). omit/undefined = no background. */
  src?: string | null
  className?: string
  /** All background styling EXCEPT backgroundImage (size/repeat/position…), plus layout. */
  style?: React.CSSProperties
  /** Optimizer width for the cover file (1024 default — header bands). */
  thumbWidth?: number
  children?: React.ReactNode
}

/**
 * Drop-in for divs that paint covers via CSS backgroundImage. Preloads
 * through the shared IPFS gateway chain (fast Filebase first, pinned
 * Pinata fallback) and only sets the background once it actually loads —
 * a slow or blocked gateway never leaves a broken frame, and placeholders
 * / overlays behind it stay visible meanwhile.
 */
export default function IpfsCover({
  src,
  className,
  style,
  thumbWidth = 1024,
  children,
}: IpfsCoverProps) {
  const [bg, setBg] = useState<string | null>(null)

  useEffect(() => {
    if (!src) {
      setBg(null)
      return
    }
    let cancelled = false
    const candidates = imageCandidates(src, thumbWidth)
    ;(async () => {
      for (const url of candidates) {
        if (cancelled) return
        if (await loadWithTimeout(url)) {
          if (!cancelled) setBg(url)
          return
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [src, thumbWidth])

  const { backgroundImage: _ignored, ...restStyle } = style || {}

  return (
    <div
      className={className}
      style={bg ? { ...restStyle, backgroundImage: `url("${bg}")` } : restStyle}
    >
      {children}
    </div>
  )
}
