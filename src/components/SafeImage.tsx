'use client'

import IpfsImage from './IpfsImage'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fallback?: React.ReactNode
}

// Backwards-compatible thumbnail <img> with the shared IPFS gateway chain
// (fast Filebase first, pinned Pinata fallback). New code should use
// IpfsImage directly.
export default function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  return <IpfsImage src={src} alt={alt} className={className} fallback={fallback} />
}
