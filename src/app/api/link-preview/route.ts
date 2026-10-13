import { NextRequest, apiError, NextResponse } from '@/lib/api-helpers'
import { normalizeVideoUrl, normalizeAudioUrl } from '@/lib/media-links'
import { lookup } from 'node:dns/promises'

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '::' || ip === '127.0.0.1') return true
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.')
  ) return true
  const m172 = ip.match(/^172\.(\d{1,3})\./)
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) return true
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8')) return true
  // IPv4-mapped IPv6, e.g. ::ffff:10.0.0.1
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return isPrivateIp(mapped[1])
  return false
}

// SSRF guard: resolve the hostname and reject private, loopback and
// link-local destinations (cloud metadata, localhost, LAN ranges).
async function isPrivateDestination(hostname: string): Promise<boolean> {
  try {
    const addresses = await lookup(hostname, { all: true })
    return addresses.some(a => isPrivateIp(a.address))
  } catch {
    return true
  }
}

function nullPreview(domain: string) {
  return NextResponse.json({ title: null, description: null, image: null, domain })
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return apiError("Missing url param", 400)
  }

  let parsed: URL
  try { parsed = new URL(url) } catch {
    return apiError("Invalid URL", 400)
  }
  if (['http:', 'https:'].indexOf(parsed.protocol) === -1) {
    return apiError("Invalid protocol", 400)
  }

  // oEmbed first: YouTube/Vimeo/SoundCloud block scraping but expose
  // first-party oEmbed (title, author, thumbnail) with no key.
  const oembed = await tryOEmbed(url)
  if (oembed) return NextResponse.json(oembed)

  if (await isPrivateDestination(parsed.hostname)) {
    return apiError("URL not allowed", 400)
  }

  try {
    // Follow redirects manually so every hop is validated against the
    // private-destination guard before it is fetched.
    let current = url
    let res: Response | null = null
    for (let hop = 0; hop < 5; hop++) {
      res = await fetch(current, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
      })
      if (res.status < 300 || res.status >= 400) break
      const location = res.headers.get('location')
      if (!location) break
      let next: URL
      try { next = new URL(location, current) } catch { break }
      if (['http:', 'https:'].indexOf(next.protocol) === -1) break
      if (await isPrivateDestination(next.hostname)) {
        return apiError("URL not allowed", 400)
      }
      current = next.toString()
    }

    if (!res || !res.ok) {
      return nullPreview(parsed.hostname)
    }

    const html = await res.text()
    const domain = new URL(current).hostname

    const ogTitle = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || ''
    const ogDescription = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || ''
    const ogImage = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || ''

    return NextResponse.json({
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      domain,
    })
  } catch {
    return nullPreview(parsed.hostname)
  }
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegex(property)}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegex(property)}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function tryOEmbed(url: string): Promise<{ title: string | null; description: string | null; image: string | null; domain: string } | null> {
  const domain = new URL(url).hostname
  const video = normalizeVideoUrl(url)
  const audio = video?.kind === 'unsupported' || !video ? normalizeAudioUrl(url) : null
  let endpoint: string | null = null
  if (video?.kind === 'youtube') endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  else if (video?.kind === 'vimeo') endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
  else if (audio?.kind === 'soundcloud') endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`
  if (!endpoint) return null
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.title) return null
    return {
      title: String(data.title),
      description: data.author_name ? `by ${String(data.author_name)}` : null,
      image: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      domain,
    }
  } catch {
    return null
  }
}
