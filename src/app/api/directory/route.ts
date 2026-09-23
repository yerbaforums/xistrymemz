import { NextResponse } from '@/lib/api-helpers'
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
            select: { id: true, shopName: true, shopImage: true, shopSlug: true, shopCategory: true, location: true, latitude: true, longitude: true, createdAt: true, name: true, image: true, _count: { select: { products: true } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(s => ({ id: s.id, title: s.shopName || 'Shop', image: s.shopImage, url: `/shop/${s.shopSlug}`, meta: `📍 ${s.location || 'Location unknown'}`, type: 'shop', itemType: 'SHOP', userId: s.id, category: s.shopCategory, extra: `${s._count.products} products`, owner: s.name || undefined, ownerImage: s.image, latitude: s.latitude ?? null, longitude: s.longitude ?? null, createdAt: s.createdAt.toISOString() }))
        }
        case 'product': {
          const rows = await prisma.product.findMany({
            where: { published: true, ...(q ? { title: whereName } : {}), ...(cat ? { category: cat } : {}) },
            select: { id: true, title: true, imageUrl: true, price: true, category: true, condition: true, location: true, latitude: true, longitude: true, createdAt: true, userId: true, user: { select: { name: true, image: true } }, hashtags: { select: { hashtag: { select: { tag: true } } } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(p => ({ id: p.id, title: p.title, image: p.imageUrl, url: `/products/${p.id}`, meta: p.price ? `$${p.price}` : undefined, type: 'product', itemType: 'PRODUCT', userId: p.userId, category: p.category, extra: p.condition || undefined, location: p.location || undefined, latitude: p.latitude ?? null, longitude: p.longitude ?? null, owner: p.user.name || undefined, ownerImage: p.user.image, hashtags: p.hashtags.map(h => h.hashtag.tag), createdAt: p.createdAt.toISOString() }))
        }
        case 'service': {
          const rows = await prisma.serviceOffering.findMany({
            where: { isActive: true, ...(q ? { title: whereName } : {}), ...(cat ? { category: cat } : {}) },
            select: { id: true, title: true, imageUrl: true, price: true, category: true, duration: true, location: true, createdAt: true, userId: true, latitude: true, longitude: true, user: { select: { name: true, image: true, latitude: true, longitude: true } }, hashtags: { select: { hashtag: { select: { tag: true } } } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(s => ({ id: s.id, title: s.title, image: s.imageUrl, url: `/services/${s.id}`, meta: s.price ? `$${s.price}` : undefined, type: 'service', itemType: 'SERVICE', userId: s.userId, category: s.category, extra: `${s.duration} min`, location: s.location || undefined, latitude: s.latitude ?? s.user.latitude ?? null, longitude: s.longitude ?? s.user.longitude ?? null, owner: s.user.name || undefined, ownerImage: s.user.image, hashtags: s.hashtags.map(h => h.hashtag.tag), createdAt: s.createdAt.toISOString() }))
        }
        case 'rental': {
          const rows = await prisma.product.findMany({
            where: { published: true, type: 'RENTAL', ...(q ? { title: whereName } : {}) },
            select: { id: true, title: true, imageUrl: true, rentalDaily: true, rentalWeekly: true, rentalMonthly: true, rentalDeposit: true, category: true, location: true, latitude: true, longitude: true, createdAt: true, userId: true, hashtags: { select: { hashtag: { select: { tag: true } } } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(r => ({ id: r.id, title: r.title, image: r.imageUrl, url: `/products/${r.id}`, meta: r.rentalDaily ? `$${r.rentalDaily}/day` : undefined, type: 'rental', itemType: 'PRODUCT', userId: r.userId, category: r.category || undefined, extra: r.rentalWeekly ? `$${r.rentalWeekly}/wk` : r.rentalMonthly ? `$${r.rentalMonthly}/mo` : undefined, location: r.location || undefined, latitude: r.latitude ?? null, longitude: r.longitude ?? null, hashtags: r.hashtags.map(h => h.hashtag.tag), createdAt: r.createdAt.toISOString() }))
        }
        case 'event': {
          const rows = await prisma.event.findMany({
            where: { ...(q ? { title: whereName } : {}), ...(cat ? { eventCategory: cat } : {}) },
            select: { id: true, title: true, eventDate: true, eventCategory: true, location: true, latitude: true, longitude: true, organizerId: true, organizer: { select: { name: true, image: true } }, eventHashtags: { select: { hashtag: { select: { tag: true } } } } },
            take, orderBy: { eventDate: 'desc' }
          })
          return rows.map(e => ({ id: e.id, title: e.title, image: null, url: `/events/${e.id}`, meta: e.eventDate ? new Date(e.eventDate).toLocaleDateString() : undefined, type: 'event', itemType: 'EVENT', userId: e.organizerId, category: e.eventCategory || undefined, extra: e.location || undefined, location: e.location || undefined, latitude: e.latitude ?? null, longitude: e.longitude ?? null, owner: e.organizer.name || undefined, ownerImage: e.organizer.image, hashtags: e.eventHashtags.map(h => h.hashtag.tag), createdAt: e.eventDate ? new Date(e.eventDate).toISOString() : undefined }))
        }
        case 'project': {
          const rows = await prisma.project.findMany({
            where: { published: true, ...(q ? { title: whereName } : {}) },
            select: { id: true, title: true, imageUrl: true, description: true, goals: true, location: true, latitude: true, longitude: true, createdAt: true, userId: true, user: { select: { name: true, image: true } }, hashtags: { select: { hashtag: { select: { tag: true } } } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(p => ({ id: p.id, title: p.title, image: p.imageUrl, url: `/projects/${p.id}`, meta: p.description?.slice(0, 80) || undefined, type: 'project', itemType: 'PROJECT', userId: p.userId, category: undefined, location: p.location || undefined, latitude: p.latitude ?? null, longitude: p.longitude ?? null, owner: p.user.name || undefined, ownerImage: p.user.image, hashtags: p.hashtags.map(h => h.hashtag.tag), createdAt: p.createdAt.toISOString() }))
        }
        case 'member': {
          const rows = await prisma.user.findMany({
            where: { ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { bio: { contains: q, mode: 'insensitive' as const } }] } : {}), name: { not: '' } },
            select: { id: true, name: true, image: true, username: true, location: true, bio: true, userClass: true, createdAt: true, preferences: true },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(u => {
            const prefs = (u.preferences as { privacy?: { passportVisibility?: string } } | null) ?? null
            const hidden = prefs?.privacy?.passportVisibility === 'hidden'
            return { id: u.id, title: u.name || 'Unknown', image: u.image, url: u.username ? `/profile/${u.username}` : `/profile/${u.id}`, meta: hidden ? undefined : (u.location || undefined), type: 'member', itemType: 'PROFILE', userId: u.id, category: u.userClass || undefined, extra: u.bio?.slice(0, 80) || undefined, owner: u.name || undefined, ownerImage: u.image, createdAt: u.createdAt.toISOString() }
          })
        }
        case 'request': {
          const rows = await prisma.request.findMany({
            where: { isPublic: true, ...(q ? { title: whereName } : {}) },
            select: { id: true, title: true, goalAmount: true, currentFunding: true, category: true, location: true, latitude: true, longitude: true, createdAt: true, userId: true, user: { select: { name: true, image: true } }, hashtags: { select: { hashtag: { select: { tag: true } } } } },
            take, orderBy: { createdAt: 'desc' }
          })
          return rows.map(r => ({ id: r.id, title: r.title, image: null, url: `/requests/${r.id}`, meta: r.goalAmount ? `$${r.currentFunding || 0} / $${r.goalAmount}` : undefined, type: 'request', itemType: 'REQUEST', userId: r.userId, category: r.category || undefined, location: r.location || undefined, latitude: r.latitude ?? null, longitude: r.longitude ?? null, owner: r.user.name || undefined, ownerImage: r.user.image, hashtags: r.hashtags.map(h => h.hashtag.tag), createdAt: r.createdAt.toISOString() }))
        }
        default: return []
      }
    }

    if (type && type !== 'all') {
      const items = await fetchByType(type)
      const categories: Record<string, string[]> = {}
      for (const item of items) {
        const cat = (item as { category?: string }).category
        if (cat) {
          if (!categories[type]) categories[type] = []
          if (!categories[type].includes(cat)) categories[type].push(cat)
        }
      }
      return NextResponse.json({ items, total: items.length, categories, counts: { [type + 's']: items.length } })
    }

    const [shops, products, services, rentals, events, projects, requests, members] = await Promise.all([
      fetchByType('shop'), fetchByType('product'), fetchByType('service'),
      fetchByType('rental'), fetchByType('event'), fetchByType('project'), fetchByType('request'), fetchByType('member')
    ])

    const allItems = [...shops, ...products, ...services, ...rentals, ...events, ...projects, ...requests, ...members]

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
      counts: { shops: shops.length, products: products.length, services: services.length, rentals: rentals.length, events: events.length, projects: projects.length, requests: requests.length, members: members.length }
    })
  } catch (error) {
    console.error('Directory error:', error)
    return NextResponse.json({ items: [], categories: {}, counts: {} })
  }
}
