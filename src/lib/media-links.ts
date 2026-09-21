// Shared helpers for link-based media (directory-first posture: users share
// YouTube/Vimeo/direct media links instead of uploading large files).
// Pure functions — safe to import from both client components and API routes.

export type EmbedKind = 'youtube' | 'vimeo' | 'soundcloud' | 'direct-video' | 'direct-audio' | 'unsupported'

export interface NormalizedMedia {
  kind: EmbedKind
  /** Canonical URL to store (embed URL for iframes, direct URL otherwise). */
  url: string
  /** Original user-supplied URL. */
  original: string
}

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i
const DIRECT_AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|wav|webm|opus|flac)(\?|#|$)/i

function httpsOnly(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:') return null
    return u
  } catch {
    return null
  }
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v')
      return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null
    }
    const shorts = url.pathname.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{6,})/)
    if (shorts) return shorts[2]
  }
  return null
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const m = url.pathname.match(/\/(\d{5,})/)
    if (m) return m[1]
  }
  return null
}

/** Normalize a user-supplied video URL into a storable + renderable form. */
export function normalizeVideoUrl(raw: string): NormalizedMedia | null {
  const url = httpsOnly(raw)
  if (!url) return null
  const yt = youtubeId(url)
  if (yt) return { kind: 'youtube', url: `https://www.youtube.com/embed/${yt}`, original: raw.trim() }
  const vimeo = vimeoId(url)
  if (vimeo) return { kind: 'vimeo', url: `https://player.vimeo.com/video/${vimeo}`, original: raw.trim() }
  if (DIRECT_VIDEO_EXT.test(url.pathname)) {
    return { kind: 'direct-video', url: url.toString(), original: raw.trim() }
  }
  return { kind: 'unsupported', url: raw.trim(), original: raw.trim() }
}

/** Normalize a user-supplied audio URL. Embeds only where the feed stays valid. */
export function normalizeAudioUrl(raw: string): NormalizedMedia | null {
  const url = httpsOnly(raw)
  if (!url) return null
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) {
    return {
      kind: 'soundcloud',
      url: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}`,
      original: raw.trim(),
    }
  }
  if (DIRECT_AUDIO_EXT.test(url.pathname)) {
    return { kind: 'direct-audio', url: url.toString(), original: raw.trim() }
  }
  return { kind: 'unsupported', url: raw.trim(), original: raw.trim() }
}

/** True for URLs our own storage issued (local /uploads/* or IPFS gateway
 * /ipfs/{cid} links, which carry no file extension). These were magic-byte
 * validated at upload time, so they always pass. */
export function isStoredMediaUrl(raw: string): boolean {
  const t = raw.trim()
  if (t.startsWith('/uploads/')) return true
  const u = httpsOnly(t)
  if (!u) return false
  return /\/ipfs\/[A-Za-z0-9]{10,}/.test(u.pathname)
}

/** Server-side guard: accept only https URLs of a known media kind. */
export function isAllowedMediaUrl(raw: unknown, kinds: EmbedKind[]): raw is string {
  if (typeof raw !== 'string' || !raw.trim()) return false
  if (raw.length > 2000) return false
  if (isStoredMediaUrl(raw)) return true
  const v = normalizeVideoUrl(raw)
  if (v && kinds.includes(v.kind)) return true
  const a = normalizeAudioUrl(raw)
  if (a && kinds.includes(a.kind)) return true
  return false
}

export const POST_VIDEO_KINDS: EmbedKind[] = ['youtube', 'vimeo', 'direct-video']
/** Podcast episodes: direct audio files only, so the RSS <enclosure> stays valid. */
export const EPISODE_AUDIO_KINDS: EmbedKind[] = ['direct-audio']
export const GENERAL_AUDIO_KINDS: EmbedKind[] = ['direct-audio', 'soundcloud']

export const MEDIA_LINK_HINT = 'Paste a YouTube, Vimeo, or direct mp4/webm link (https)'
export const AUDIO_LINK_HINT = 'Paste a direct audio file link (mp3, m4a, ogg, wav — https)'
