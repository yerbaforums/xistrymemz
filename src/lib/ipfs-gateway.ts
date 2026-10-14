// Central IPFS gateway ordering — single source of truth for every image
// render path (plain <img>, next/image, CSS backgrounds).
//
// Measured (Oct 2026, production CIDs):
// - gateway.pinata.cloud: 4–7s per image (free-tier public gateway throttle)
// - ipfs.filebase.io:     ~1s warm, slow on cold CIDs — but always resolves
// - ipfs.xistrymemz.xyz:  DEAD (Vercel DEPLOYMENT_NOT_FOUND) — removed
// - ipfs.io / dweb.link:  instant HTTP 429 — removed
//
// Strategy: try Filebase first (fast when warm), fall back to Pinata
// (content is pinned there, so it always resolves). Components race with a
// timeout so a hanging primary never blocks the fallback.

export const IPFS_PRIMARY_GATEWAY = 'https://ipfs.filebase.io'
export const IPFS_FALLBACK_GATEWAY = 'https://gateway.pinata.cloud'

const PINATA_RE = /^https:\/\/gateway\.pinata\.cloud(\/ipfs\/.*)$/
const FILEBASE_RE = /^https:\/\/ipfs\.filebase\.io(\/ipfs\/.*)$/

/** Extract the `/ipfs/{cid...}` path from a known gateway URL. */
export function ipfsPath(src: string): string | null {
  const m = src.match(PINATA_RE) || src.match(FILEBASE_RE)
  return m ? m[1] : null
}

/** Rewrite any known-gateway URL to the primary (fast) gateway. */
export function primaryIpfsUrl(src: string): string {
  const path = ipfsPath(src)
  return path ? `${IPFS_PRIMARY_GATEWAY}${path}` : src
}

/** Rewrite any known-gateway URL to the fallback (pinned) gateway. */
export function fallbackIpfsUrl(src: string): string {
  const path = ipfsPath(src)
  return path ? `${IPFS_FALLBACK_GATEWAY}${path}` : src
}

/** True when this URL can participate in the gateway fallback chain. */
export function isIpfsGatewayUrl(src: string): boolean {
  return ipfsPath(src) !== null
}

/**
 * Ordered candidate URLs for an image: primary first, pinned fallback
 * second. Non-IPFS URLs pass through untouched (single candidate).
 */
export function ipfsCandidates(src: string): string[] {
  if (!isIpfsGatewayUrl(src)) return [src]
  const primary = primaryIpfsUrl(src)
  const fallback = fallbackIpfsUrl(src)
  return primary === fallback ? [primary] : [primary, fallback]
}

/**
 * Widths the Next image optimizer will serve. MUST mirror next.config.js
 * imageSizes + deviceSizes — any other `w` gets an HTTP 400 from
 * /_next/image (caught live on w=512 before the config was extended).
 */
export const ALLOWED_THUMB_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 512,
  640, 768, 1024, 1280, 1536,
]

function assertThumbWidth(w: number): void {
  if (process.env.NODE_ENV !== 'production' && !ALLOWED_THUMB_WIDTHS.includes(w)) {
    console.warn(
      `[images] thumbWidth ${w} is not in next.config.js imageSizes/deviceSizes — /_next/image will 400. Use one of: ${ALLOWED_THUMB_WIDTHS.join(', ')}`
    )
  }
}

/**
 * Full load chain for an image: optimizer thumbs first (small, cached),
 * raw gateways last (full-size last resort). Pass thumbWidth for
 * below-the-fold thumbs; omit it for full-size heroes.
 */
export function imageCandidates(src: string, thumbWidth?: number): string[] {
  if (!thumbWidth || !isIpfsGatewayUrl(src)) return ipfsCandidates(src)
  assertThumbWidth(thumbWidth)
  const opt = (u: string) =>
    `/_next/image?url=${encodeURIComponent(u)}&w=${thumbWidth}&q=75`
  return [opt(primaryIpfsUrl(src)), opt(fallbackIpfsUrl(src)), ...ipfsCandidates(src)]
}
