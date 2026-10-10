'use client'

import { useState } from 'react'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fallback?: React.ReactNode
}

// Thumbnail <img> with a gateway fallback chain. Public Pinata gateways get
// blocked by some ad-blockers/privacy filters (crypto-associated host), so a
// failed load retries once against the self-hosted gateway before giving up
// to the emoji fallback. Keeps directory/homepage grids intact.
const FALLBACK_HOSTS: [RegExp, string][] = [
  [/^https:\/\/gateway\.pinata\.cloud(\/.*)$/, 'https://ipfs.xistrymemz.xyz$1'],
]

function fallbackSrc(src: string): string | null {
  for (const [re, replacement] of FALLBACK_HOSTS) {
    if (re.test(src)) return src.replace(re, replacement)
  }
  return null
}

export default function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  const [current, setCurrent] = useState(src)
  const [failed, setFailed] = useState(false)

  // New src prop resets the chain (e.g. list re-query).
  const [seen, setSeen] = useState(src)
  if (seen !== src) {
    setSeen(src)
    setCurrent(src)
    setFailed(false)
  }

  if (failed) return <>{fallback ?? null}</>

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        const next = fallbackSrc(current)
        if (next && next !== current) setCurrent(next)
        else setFailed(true)
      }}
    />
  )
}
