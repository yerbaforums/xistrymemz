import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const q = searchParams.get('q')

    const take = 50
    const whereName = q ? { contains: q, mode: 'insensitive' as const } : undefined

    const fetchByType = async (typeFilter: string) => {
      switch (typeFilter) {
        case 'shop': return (await prisma.user.findMany({
          where: { shopSlug: { not: null }, shopName: { not: '' }, ...(q ? { shopName: whereName } : {}) },
          select: { id: true, shopName: true, shopImage: true, shopSlug: true, shopCategory: true, location: true, _count: { select: { products: true } } },
          take, orderBy: { createdAt: 'desc' }
        })).map(s => ({ id: s.id, title: s.shopName || 'Shop', image: s.shopImage, url: `/shop/${s.shopSlug}`, meta: s.shopCategory, type: 'shop' }))
        case 'product': return (await prisma.product.findMany({
          where: { published: true, ...(q ? { title: whereName } : {}) },
          select: { id: true, title: true, imageUrl: true, price: true },
          take, orderBy: { createdAt: 'desc' }
        })).map(p => ({ id: p.id, title: p.title, image: p.imageUrl, url: `/products/${p.id}`, meta: p.price ? `$${p.price}` : undefined, type: 'product' }))
        case 'service': return (await prisma.serviceOffering.findMany({
          where: { ...(q ? { title: whereName } : {}) },
          select: { id: true, title: true, imageUrl: true, price: true },
          take, orderBy: { createdAt: 'desc' }
        })).map(s => ({ id: s.id, title: s.title, image: s.imageUrl, url: `/services/${s.id}`, meta: s.price ? `$${s.price}` : undefined, type: 'service' }))
        case 'rental': return (await prisma.product.findMany({
          where: { published: true, type: 'RENTAL', ...(q ? { title: whereName } : {}) },
          select: { id: true, title: true, imageUrl: true, rentalDaily: true },
          take, orderBy: { createdAt: 'desc' }
        })).map(r => ({ id: r.id, title: r.title, image: r.imageUrl, url: `/products/${r.id}`, meta: r.rentalDaily ? `$${r.rentalDaily}/day` : undefined, type: 'rental' }))
        case 'event': return (await prisma.event.findMany({
          where: { ...(q ? { title: whereName } : {}) },
          select: { id: true, title: true, eventDate: true },
          take, orderBy: { eventDate: 'desc' }
        })).map(e => ({ id: e.id, title: e.title, image: null, url: `/events/${e.id}`, meta: e.eventDate ? new Date(e.eventDate).toLocaleDateString() : undefined, type: 'event' }))
        case 'plan': return (await prisma.plan.findMany({
          where: { published: true, ...(q ? { title: whereName } : {}) },
          select: { id: true, title: true, imageUrl: true },
          take, orderBy: { createdAt: 'desc' }
        })).map(p => ({ id: p.id, title: p.title, image: p.imageUrl, url: `/plans/${p.id}`, meta: 'Project', type: 'plan' }))
        case 'request': return (await prisma.request.findMany({
          where: { isPublic: true, ...(q ? { title: whereName } : {}) },
          select: { id: true, title: true, goalAmount: true, currentFunding: true },
          take, orderBy: { createdAt: 'desc' }
        })).map(r => ({ id: r.id, title: r.title, image: null, url: `/requests/${r.id}`, meta: r.goalAmount ? `$${r.currentFunding || 0} / $${r.goalAmount}` : undefined, type: 'request' }))
        default: return []
      }
    }

    if (type && type !== 'all') {
      const items = await fetchByType(type)
      return NextResponse.json({ items, total: items.length })
    }

    const [shops, products, services, rentals, events, plans, requests] = await Promise.all([
      fetchByType('shop'), fetchByType('product'), fetchByType('service'),
      fetchByType('rental'), fetchByType('event'), fetchByType('plan'), fetchByType('request')
    ])

    return NextResponse.json({
      items: [...shops, ...products, ...services, ...rentals, ...events, ...plans, ...requests],
      counts: { shops: shops.length, products: products.length, services: services.length, rentals: rentals.length, events: events.length, plans: plans.length, requests: requests.length }
    })
  } catch (error) {
    console.error('Directory error:', error)
    return NextResponse.json({ items: [], counts: {} })
  }
}
