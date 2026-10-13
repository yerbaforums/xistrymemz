import { apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type ExportType = 'visits' | 'pages' | 'referrers' | 'countries'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','))
  }
  return lines.join('\n')
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
      return apiError("Unauthorized", 403)
    }

    const url = new URL(request.url)
    const type = (url.searchParams.get('type') || 'visits') as ExportType
    const range = url.searchParams.get('range') || null

    let since: Date | null = null
    if (range === '24h') since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    else if (range === '7d') since = daysAgo(7)
    else if (range === '30d') since = daysAgo(30)

    const timeFilter = since ? { createdAt: { gte: since } } : {}
    let rows: Record<string, unknown>[] = []
    let filename = `${type}-export.csv`

    if (type === 'visits') {
      const visits = await prisma.pageVisit.findMany({
        where: timeFilter,
        orderBy: { createdAt: 'desc' },
        take: 10000,
        select: {
          id: true, ipHash: true, country: true, city: true, region: true,
          landingPage: true, referrer: true, referrerDomain: true, referrerType: true,
          userId: true, createdAt: true,
        },
      })
      rows = visits.map(v => ({
        id: v.id,
        visitor: v.ipHash || '',
        country: v.country || '',
        city: v.city || '',
        region: v.region || '',
        page: v.landingPage || '/',
        referrer: v.referrer || '',
        referrerDomain: v.referrerDomain || '',
        referrerType: v.referrerType || '',
        userId: v.userId || '',
        date: v.createdAt.toISOString(),
      }))
      filename = `visits-${range || 'all'}.csv`
    } else if (type === 'pages') {
      const pages = await prisma.pageVisit.groupBy({
        by: ['landingPage'],
        _count: true,
        orderBy: { _count: { landingPage: 'desc' } },
        where: { landingPage: { not: null }, ...timeFilter },
        take: 100,
      })
      rows = pages.map(p => ({ page: p.landingPage, visits: p._count }))
      filename = `pages-${range || 'all'}.csv`
    } else if (type === 'referrers') {
      const referrers = await prisma.pageVisit.groupBy({
        by: ['referrer'],
        _count: true,
        orderBy: { _count: { referrer: 'desc' } },
        where: { referrer: { not: null }, ...timeFilter },
        take: 100,
      })
      rows = referrers.map(r => ({ referrer: r.referrer, visits: r._count }))
      filename = `referrers-${range || 'all'}.csv`
    } else if (type === 'countries') {
      const countries = await prisma.pageVisit.groupBy({
        by: ['country'],
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        where: { country: { not: null }, ...timeFilter },
        take: 100,
      })
      rows = countries.map(c => ({ country: c.country, visits: c._count }))
      filename = `countries-${range || 'all'}.csv`
    } else {
      return apiError("Invalid export type. Use visits, pages, referrers or countries", 400)
    }

    const csv = toCsv(rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Analytics export error:', error)
    return apiError("Failed to export analytics", 500)
  }
}
