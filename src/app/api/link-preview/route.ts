import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ title: null, description: null, image: null, domain: new URL(url).hostname })
    }

    const html = await res.text()
    const domain = new URL(url).hostname

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
    return NextResponse.json({
      title: null,
      description: null,
      image: null,
      domain: new URL(url).hostname,
    })
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
