import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import geoip from 'geoip-lite'

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + 'xistrymemz-visitsalt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

function geoLookup(ip: string): { country: string | null; city: string | null; region: string | null; latitude: number | null; longitude: number | null } {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { country: null, city: null, region: null, latitude: null, longitude: null }
  }
  const lookup = geoip.lookup(ip)
  if (!lookup) {
    return { country: null, city: null, region: null, latitude: null, longitude: null }
  }
  return {
    country: lookup.country || null,
    city: lookup.city || null,
    region: lookup.region || null,
    latitude: lookup.ll?.[0] ?? null,
    longitude: lookup.ll?.[1] ?? null,
  }
}

const SEARCH_DOMAINS = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex', 'ecosia', 'ask.com']
const SOCIAL_DOMAINS = ['facebook', 'twitter', 'x.com', 'instagram', 'linkedin', 'reddit', 'tiktok', 'pinterest', 'youtube', 't.co', 'fb.com', 'm.facebook.com', 'l.facebook.com', 'lnkd.in']

function classifyReferrer(referrer: string | null): { domain: string | null; type: string } {
  if (!referrer) return { domain: null, type: 'direct' }

  try {
    const url = new URL(referrer)
    const domain = url.hostname.replace('www.', '').toLowerCase()

    if (SEARCH_DOMAINS.some(sd => domain.includes(sd))) {
      return { domain, type: 'search' }
    }

    if (SOCIAL_DOMAINS.some(sd => domain.includes(sd))) {
      return { domain, type: 'social' }
    }

    return { domain, type: 'other' }
  } catch {
    return { domain: null, type: 'direct' }
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { referrer, landingPage } = body

    const headersList = await headers()
    const rawIP = headersList.get('x-forwarded-for') || 'unknown'
    const ipHash = await hashIP(rawIP)
    const vercelCountry = headersList.get('x-vercel-ip-country') || null
    const userAgent = headersList.get('user-agent') || null

    // geo-resolve before hashing (ipHash stored for anonymous dedup, geo stored for all)
    const geo = geoLookup(rawIP)
    const country = vercelCountry || geo.country

    const { domain, type } = classifyReferrer(referrer)

    await prisma.pageVisit.create({
      data: {
        userId: session?.user?.id || null,
        ipHash: session?.user?.id ? null : ipHash,
        country,
        city: geo.city,
        region: geo.region,
        latitude: geo.latitude,
        longitude: geo.longitude,
        referrer,
        referrerDomain: domain,
        referrerType: type,
        landingPage: landingPage || '/',
        userAgent,
      },
    })

    return apiSuccess({ recorded: true })
  } catch (error) {
    console.error('Error recording visit:', error)
    return apiError("Failed to record visit", 500)
  }
}
