'use client'

import { useEffect, useRef, useState } from 'react'
import { imageCandidates, IMAGE_CANDIDATE_TIMEOUT_MS } from '@/lib/ipfs-gateway'
import styles from './IpfsImage.module.css'

interface IpfsImageProps {
  src: string
  alt: string
  className?: string
  /** Shown when every gateway fails (defaults to nothing). */
  fallback?: React.ReactNode
  /** Eager for above-the-fold imagery; lazy everywhere else. */
  eager?: boolean
  width?: number | string
  height?: number | string
  /** Called when every gateway candidate has failed. */
  onExhausted?: () => void
  /** Click handler (images that act as buttons/open lightboxes). */
  onClick?: (e: React.MouseEvent) => void
  /** Stored image URLs only — never secrets. */
  style?: React.CSSProperties
  /**
   * Serve a resized variant through the Next image optimizer instead of the
   * raw file (e.g. 256 for avatars, 512 for cards). The optimizer caches the
   * resized output, so grids stop downloading full 1920px uploads — with no
   * extra pins against the free-tier file quota.
   */
  thumbWidth?: number
}

// Central image component. Walks the gateway chain (fast Filebase first,
// pinned Pinata fallback) so a slow or blocked gateway never leaves a
// broken frame. Renders a shimmer placeholder until first paint to avoid
// layout shift, then fades the image in.
export default function IpfsImage({
  src,
  alt,
  className = '',
  fallback,
  eager = false,
  width,
  height,
  onExhausted,
  thumbWidth,
  onClick,
  style,
}: IpfsImageProps) {
  const [candidates, setCandidates] = useState(() => imageCandidates(src, thumbWidth))
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const exhaustedRef = useRef(onExhausted)
  exhaustedRef.current = onExhausted

  // New src prop restarts the chain (e.g. list re-query).
  useEffect(() => {
    setCandidates(imageCandidates(src, thumbWidth))
    setIndex(0)
    setLoaded(false)
    setFailed(false)
  }, [src, thumbWidth])

  const failAll = () => {
    setFailed(true)
    exhaustedRef.current?.()
  }

  const advance = () => {
    if (index + 1 < candidates.length) setIndex(index + 1)
    else failAll()
  }

  // Stall guard: gateways sometimes accept a connection and then go
  // silent (neither onload nor onerror fire). If the current candidate is
  // still pending after the grace period, force-advance instead of spinning
  // forever. The <img> onError below handles fast failures; this handles
  // hangs. (A plain timer — no second preload — so cold origins aren't hit
  // twice.)
  useEffect(() => {
    if (loaded || failed) return
    if (!candidates[index]) {
      failAll()
      return
    }
    const t = setTimeout(() => {
      if (index + 1 < candidates.length) setIndex(index + 1)
      else failAll()
    }, IMAGE_CANDIDATE_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [candidates, index, loaded, failed])

  if (failed) return <>{fallback ?? null}</>

  return (
    <span
      className={`${styles.frame} ${loaded ? styles.isLoaded : ''} ${className}`}
      style={{ width: width ?? undefined, height: height ?? undefined, ...style }}
      onClick={onClick}
    >
      {!loaded && <span className={styles.shimmer} aria-hidden="true" />}
      <img
        src={candidates[index]}
        alt={alt}
        className={styles.img}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        onLoad={() => setLoaded(true)}
        onError={advance}
      />
    </span>
  )
}
