import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['en', 'es', 'fr', 'pt', 'it', 'ru', 'ar', 'de', 'hi', 'ja', 'zh', 'ko', 'nl', 'pl', 'sv', 'tr']
const DEFAULT_LOCALE = 'en'

const ALLOWED_ORIGIN = process.env.NEXTAUTH_URL || 'http://localhost:3000'

function getOrigin(url: string): string | null {
  try { return new URL(url).origin }
  catch { return null }
}

function isSameOrigin(request: NextRequest): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const source = origin || referer || ''
  if (!source) return true
  const sourceOrigin = getOrigin(source)
  const allowedOrigin = getOrigin(ALLOWED_ORIGIN)
  if (!sourceOrigin || !allowedOrigin) return false
  return sourceOrigin === allowedOrigin
}

const CSRF_EXEMPT_PATHS = ['/api/auth/', '/api/fediverse/', '/api/.well-known/']

interface RateLimitEntry { count: number; resetTime: number }
const MAX_STORE_SIZE = 10000
const CLEANUP_INTERVAL = 5 * 60 * 1000

declare global {
  var rateLimitMemoryStore: Map<string, RateLimitEntry> | undefined
  var rateLimitLastCleanup: number | undefined
}

if (!global.rateLimitMemoryStore) global.rateLimitMemoryStore = new Map()
if (!global.rateLimitLastCleanup) global.rateLimitLastCleanup = Date.now()

function cleanOldEntries(): void {
  const now = Date.now()
  if (now - (global.rateLimitLastCleanup ?? 0) < CLEANUP_INTERVAL) return
  global.rateLimitLastCleanup = now
  const store = global.rateLimitMemoryStore
  if (!store) return
  const keysToDelete: string[] = []
  store.forEach((entry, key) => { if (entry.resetTime < now) keysToDelete.push(key) })
  keysToDelete.forEach(key => store.delete(key))
}

function evictOldest(store: Map<string, RateLimitEntry>): void {
  if (store.size < MAX_STORE_SIZE) return
  let oldestKey: string | null = null
  let oldestTime = Infinity
  store.forEach((entry, key) => {
    if (entry.resetTime < oldestTime) { oldestKey = key; oldestTime = entry.resetTime }
  })
  if (oldestKey) store.delete(oldestKey)
}

function rateLimit(interval: number, maxRequests: number) {
  return async (token: string) => {
    const now = Date.now()
    const key = `ratelimit_${token}`
    cleanOldEntries()
    const store = global.rateLimitMemoryStore
    if (!store) return { success: true, remaining: maxRequests, reset: now + interval, total: maxRequests }
    evictOldest(store)
    let entry = store.get(key)
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + interval }
      store.set(key, entry)
    }
    entry.count++
    const remaining = Math.max(0, maxRequests - entry.count)
    const reset = entry.resetTime
    if (entry.count > maxRequests) return { success: false, remaining: 0, reset, total: maxRequests }
    return { success: true, remaining, reset, total: maxRequests }
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
}

const RATE_LIMIT_CONFIGS = {
  auth: { interval: 60 * 1000, maxRequests: 5 },
  search: { interval: 60 * 1000, maxRequests: 30 },
  write: { interval: 60 * 1000, maxRequests: 60 },
  read: { interval: 60 * 1000, maxRequests: 120 },
} as const

type RouteType = keyof typeof RATE_LIMIT_CONFIGS

function getRouteType(path: string, method: string): RouteType | null {
  if (path.includes('/api/auth/login') || path.includes('/api/auth/register') ||
      path.includes('/api/auth/forgot-password') || path.includes('/api/auth/reset-password') ||
      path.includes('/api/auth/[...nextauth]')) return 'auth'
  if (path.startsWith('/api/search')) return 'search'
  if (path.startsWith('/api/')) {
    return (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) ? 'write' : 'read'
  }
  return null
}

function detectLocale(request: NextRequest): string {
  const pathLocale = LOCALES.find(l => request.nextUrl.pathname.startsWith(`/${l}/`) || request.nextUrl.pathname === `/${l}`)
  if (pathLocale) return pathLocale

  const acceptLang = request.headers.get('accept-language') || ''
  for (const part of acceptLang.split(',')) {
    const lang = part.split(';')[0].trim().split('-')[0].toLowerCase()
    if (LOCALES.includes(lang)) return lang
  }
  return DEFAULT_LOCALE
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/api/:path*',
  ],
}

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const method = request.method

  if (!path.startsWith('/api/')) {
    const detected = detectLocale(request)

    // If path starts with a locale prefix, rewrite it away (e.g., /es/about → /about)
    const localePrefix = LOCALES.find(l => path === `/${l}` || path.startsWith(`/${l}/`))
    if (localePrefix) {
      const newPath = path.replace(`/${localePrefix}`, '') || '/'
      const url = new URL(newPath, request.url)
      url.search = request.nextUrl.search
      const rewrite = NextResponse.rewrite(url)
      rewrite.headers.set('x-next-intl-locale', localePrefix)
      return rewrite
    }

    // No locale prefix: set cookie/header for i18n, rewrite only if browser locale differs from default
    const response = NextResponse.next()
    response.headers.set('x-next-intl-locale', detected)

    // Set cookie so server can detect locale on subsequent requests
    response.cookies.set('NEXT_LOCALE', detected, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })

    return response
  }

  // API routes: CSRF check
  if (!CSRF_EXEMPT_PATHS.some(p => path.startsWith(p))) {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden', message: 'Cross-site request rejected' }, { status: 403 })
    }
  }

  // API routes: rate limiting
  const routeType = getRouteType(path, method)
  if (!routeType) return NextResponse.next()

  const clientIP = getClientIP(request)
  const cfg = RATE_LIMIT_CONFIGS[routeType]
  const limiter = rateLimit(cfg.interval, cfg.maxRequests)
  const result = await limiter(clientIP)

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.total),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    )
  }

  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(result.total))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.reset))
  return response
}
