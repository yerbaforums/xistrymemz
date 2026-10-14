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
// (content is pinned there, so it always resolves). A per-candidate stall
// timer force-advances hangs, since stalled connections fire neither
// onload nor onerror.

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

export const IMAGE_CANDIDATE_TIMEOUT_MS = 12000

/**
 * Load an image URL, resolving false if it errors OR stalls past the
 * timeout. Stalled gateway connections (accepted, then silence) fire
 * neither onload nor onerror — without this the UI waits forever.
 */
export function loadWithTimeout(url: string, timeoutMs = IMAGE_CANDIDATE_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(ok)
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    // setTimeout throttling in background tabs can delay this; acceptable.
    const img = new Image()
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
    img.src = url
  })
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

/**
 * Snap an arbitrary pixel width up to the nearest optimizer-legal width
 * (e.g. retina avatar math like 28px × 2 = 56 → 64). Prevents /_next/image
 * 400s from computed widths.
 */
export function snapThumbWidth(w: number): number {
  for (const allowed of ALLOWED_THUMB_WIDTHS) {
    if (allowed >= w) return allowed
  }
  return ALLOWED_THUMB_WIDTHS[ALLOWED_THUMB_WIDTHS.length - 1]
}

/**
 * Full load chain for an image: optimizer thumbs first (small, cached),
 * raw gateways last (full-size last resort). Pass thumbWidth for
 * below-the-fold thumbs; omit it for full-size heroes. Widths snap to the
 * nearest optimizer-legal size, so computed widths (e.g. retina avatars)
 * can never 400.
 */
export function imageCandidates(src: string, thumbWidth?: number): string[] {
  if (!thumbWidth || !isIpfsGatewayUrl(src)) return ipfsCandidates(src)
  const w = snapThumbWidth(Math.round(thumbWidth))
  const opt = (u: string) =>
    `/_next/image?url=${encodeURIComponent(u)}&w=${w}&q=75`
  return [opt(primaryIpfsUrl(src)), opt(fallbackIpfsUrl(src)), ...ipfsCandidates(src)]
}
