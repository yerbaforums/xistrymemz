import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const q = searchParams.get('q')
    const cat = searchParams.get('category')

    const take = 100
    const whereName = q ? { contains: q, mode: 'insensitive' as const } : undefined

    const fetchByType = async (typeFilter: string) => {
      switch (typeFilter) {
        case 'shop': {
          const rows = await prisma.user.findMany({
            where: { shopSlug: { not: null }, shopName: { not: '' }, ...(q ? { shopName: whereName } : {}), ...(cat ? { shopCategory: cat } : {}) },
            select: { id: true, shopName: true, shopImage: true, shopSlug: true, shopCategory: true, location: true, createdAt: true, _count: { select: { products: true } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(s => ({ id: s.id, title: s.shopName || 'Shop', image: s.shopImage, url: `/shop/${s.shopSlug}`, meta: `📍 ${s.location || 'Location unknown'}`, type: 'shop', category: s.shopCategory, extra: `${s._count.products} products`, createdAt: s.createdAt.toISOString() }))
        }
        case 'product': {
          const rows = await prisma.product.findMany({
            where: { published: true, ...(q ? { title: whereName } : {}), ...(cat ? { category: cat } : {}) },
            select: { id: true, title: true, imageUrl: true, price: true, category: true, condition: true, location: true, createdAt: true, user: { select: { name: true } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(p => ({ id: p.id, title: p.title, image: p.imageUrl, url: `/products/${p.id}`, meta: p.price ? `$${p.price}` : undefined, type: 'product', category: p.category, extra: p.condition || undefined, location: p.location || undefined, owner: p.user.name || undefined, createdAt: p.createdAt.toISOString() }))
        }
        case 'service': {
          const rows = await prisma.serviceOffering.findMany({
            where: { isActive: true, ...(q ? { title: whereName } : {}), ...(cat ? { category: cat } : {}) },
            select: { id: true, title: true, imageUrl: true, price: true, category: true, duration: true, createdAt: true, user: { select: { name: true } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(s => ({ id: s.id, title: s.title, image: s.imageUrl, url: `/services/${s.id}`, meta: s.price ? `$${s.price}` : undefined, type: 'service', category: s.category, extra: `${s.duration} min`, owner: s.user.name || undefined, createdAt: s.createdAt.toISOString() }))
        }
        case 'rental': {
          const rows = await prisma.product.findMany({
            where: { published: true, type: 'RENTAL', ...(q ? { title: whereName } : {}) },
            select: { id: true, title: true, imageUrl: true, rentalDaily: true, rentalWeekly: true, rentalMonthly: true, rentalDeposit: true, category: true, location: true, createdAt: true },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(r => ({ id: r.id, title: r.title, image: r.imageUrl, url: `/products/${r.id}`, meta: r.rentalDaily ? `$${r.rentalDaily}/day` : undefined, type: 'rental', category: r.category || undefined, extra: r.rentalWeekly ? `$${r.rentalWeekly}/wk` : r.rentalMonthly ? `$${r.rentalMonthly}/mo` : undefined, location: r.location || undefined, createdAt: r.createdAt.toISOString() }))
        }
        case 'event': {
          const rows = await prisma.event.findMany({
            where: { ...(q ? { title: whereName } : {}), ...(cat ? { eventCategory: cat } : {}) },
            select: { id: true, title: true, eventDate: true, eventCategory: true, location: true, organizer: { select: { name: true } } },
            take, orderBy: { eventDate: 'desc' }
          })
          return rows.map(e => ({ id: e.id, title: e.title, image: null, url: `/events/${e.id}`, meta: e.eventDate ? new Date(e.eventDate).toLocaleDateString() : undefined, type: 'event', category: e.eventCategory || undefined, extra: e.location || undefined, owner: e.organizer.name || undefined, createdAt: e.eventDate ? new Date(e.eventDate).toISOString() : undefined }))
        }
        case 'plan': {
          const rows = await prisma.project.findMany({
            where: { published: true, ...(q ? { title: whereName } : {}) },
            select: { id: true, title: true, imageUrl: true, description: true, goals: true, createdAt: true, user: { select: { name: true } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(p => ({ id: p.id, title: p.title, image: p.imageUrl, url: `/projects/${p.id}`, meta: p.description?.slice(0, 80) || undefined, type: 'plan', category: undefined, owner: p.user.name || undefined, createdAt: p.createdAt.toISOString() }))
        }
        case 'request': {
          const rows = await prisma.request.findMany({
            where: { isPublic: true, ...(q ? { title: whereName } : {}) },
            select: { id: true, title: true, goalAmount: true, currentFunding: true, category: true, createdAt: true, user: { select: { name: true } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(r => ({ id: r.id, title: r.title, image: null, url: `/requests/${r.id}`, meta: r.goalAmount ? `$${r.currentFunding || 0} / $${r.goalAmount}` : undefined, type: 'request', category: r.category || undefined, owner: r.user.name || undefined, createdAt: r.createdAt.toISOString() }))
        }
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

    const allItems = [...shops, ...products, ...services, ...rentals, ...events, ...plans, ...requests]

    const categories: Record<string, string[]> = {}
    for (const item of allItems) {
      if (item.category) {
        if (!categories[item.type]) categories[item.type] = []
        if (!categories[item.type].includes(item.category)) categories[item.type].push(item.category)
      }
    }

    return NextResponse.json({
      items: allItems,
      categories,
      counts: { shops: shops.length, products: products.length, services: services.length, rentals: rentals.length, events: events.length, plans: plans.length, requests: requests.length }
    })
  } catch (error) {
    console.error('Directory error:', error)
    return NextResponse.json({ items: [], categories: {}, counts: {} })
  }
}
