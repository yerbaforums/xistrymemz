import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [products, events, plans, requests, shops, rentals, services] = await Promise.all([
      prisma.product.findMany({
        where: { published: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, price: true, imageUrl: true, userId: true },
        take: 100,
      }),
      prisma.event.findMany({
        where: { eventDate: { gte: new Date() }, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, eventDate: true, organizerId: true },
        take: 100,
      }),
      prisma.plan.findMany({
        where: { published: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, userId: true },
        take: 100,
      }),
      prisma.request.findMany({
        where: { isPublic: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, userId: true, goalAmount: true, currentFunding: true },
        take: 100,
      }),
      prisma.user.findMany({
        where: { latitude: { not: null }, longitude: { not: null }, shopSlug: { not: null } },
        select: { id: true, shopName: true, shopSlug: true, latitude: true, longitude: true, shopImage: true },
        take: 100,
      }),
      prisma.product.findMany({
        where: { published: true, type: 'RENTAL', latitude: { not: null }, longitude: { not: null } },
        select: { id: true, title: true, latitude: true, longitude: true, rentalDaily: true, imageUrl: true },
        take: 100,
      }),
      prisma.serviceOffering.findMany({
        where: { isActive: true },
        select: { id: true, title: true, location: true, price: true, imageUrl: true, user: { select: { latitude: true, longitude: true } } },
        take: 100,
      }),
    ])

    const items = [
      ...products.map(p => ({ id: p.id, type: 'product' as const, title: p.title, lat: p.latitude!, lng: p.longitude!, url: `/products/${p.id}`, image: p.imageUrl, meta: p.price ? `$${p.price}` : undefined })),
      ...events.map(e => ({ id: e.id, type: 'event' as const, title: e.title, lat: e.latitude!, lng: e.longitude!, url: `/events/${e.id}`, image: null, meta: e.eventDate ? new Date(e.eventDate).toLocaleDateString() : undefined })),
      ...plans.map(p => ({ id: p.id, type: 'plan' as const, title: p.title, lat: p.latitude!, lng: p.longitude!, url: `/plans/${p.id}`, image: null, meta: 'Project' })),
      ...requests.map(r => ({ id: r.id, type: 'request' as const, title: r.title, lat: r.latitude!, lng: r.longitude!, url: `/requests/${r.id}`, image: null, meta: r.goalAmount ? `$${r.currentFunding || 0} / $${r.goalAmount}` : undefined })),
      ...shops.map(s => ({ id: s.id, type: 'shop' as const, title: s.shopName || 'Shop', lat: s.latitude!, lng: s.longitude!, url: `/shop/${s.shopSlug}`, image: s.shopImage, meta: 'Shop' })),
      ...rentals.map(r => ({ id: r.id, type: 'rental' as const, title: r.title, lat: r.latitude!, lng: r.longitude!, url: `/products/${r.id}`, image: r.imageUrl, meta: r.rentalDaily ? `$${r.rentalDaily}/day` : undefined })),
      ...services.filter(s => s.user?.latitude && s.user?.longitude).map(s => ({ id: s.id, type: 'service' as const, title: s.title, lat: s.user!.latitude!, lng: s.user!.longitude!, url: `/services/${s.id}`, image: s.imageUrl, meta: s.price ? `$${s.price}` : undefined })),
    ]

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching map data:', error)
    return NextResponse.json({ items: [] })
  }
}
