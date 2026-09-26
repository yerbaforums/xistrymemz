import { NextResponse, NextRequest } from 'next/server'
import { GET as getStats } from '@/app/api/stats/route'
import { GET as getShops } from '@/app/api/shops/route'
import { GET as getProducts } from '@/app/api/products/route'
import { GET as getRequests } from '@/app/api/requests/route'
import { GET as getHashtags } from '@/app/api/hashtags/route'
import { GET as getEvents } from '@/app/api/public/events/route'
import { GET as getProjects } from '@/app/api/projects/route'
import { GET as getBoards } from '@/app/api/boards/route'
import { GET as getBlogs } from '@/app/api/blogs/route'
import { GET as getPodcasts } from '@/app/api/podcasts/route'
import { GET as getServices } from '@/app/api/services/route'
import { GET as getMembers } from '@/app/api/users/recent/route'

export const dynamic = 'force-dynamic'

// Homepage diet: one round trip instead of ~12 parallel client fetches.
// Reuses the source route handlers directly (zero query drift — same shapes
// the homepage consumed before). Each leg fails soft to null, exactly like
// an individual failed fetch did.
async function json(p: Promise<Response>): Promise<unknown> {
  try {
    const res = await p
    return await res.json().catch(() => null)
  } catch {
    return null
  }
}

const req = (path: string) => new NextRequest(`http://localhost${path}`)

export async function GET() {
  const [
    stats, shops, products, requests, hashtags, events,
    projects, boards, blogs, podcasts, services, members,
  ] = await Promise.all([
    json(getStats()),
    json(getShops()),
    json(getProducts(req('/api/products?limit=6'))),
    json(getRequests(req('/api/requests?isPublic=true&take=4'))),
    json(getHashtags(req('/api/hashtags?mode=trending&limit=20'))),
    json(getEvents()),
    json(getProjects(req('/api/projects?public=true'))),
    json(getBoards(req('/api/boards?limit=4'))),
    json(getBlogs()),
    json(getPodcasts()),
    json(getServices(req('/api/services?pageSize=4'))),
    json(getMembers(req('/api/users/recent?take=6'))),
  ])

  return NextResponse.json({
    stats, shops, products, requests, hashtags, events,
    projects, boards, blogs, podcasts, services, members,
  })
}
