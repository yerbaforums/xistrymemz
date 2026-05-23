import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [members, shops, schools, products, services, rentals, events, plans, requests, forumPosts, forumReplies, offers, appointments] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { shopSlug: { not: null } } }),
      prisma.user.count({ where: { schoolSlug: { not: null } } }),
      prisma.product.count({ where: { published: true, type: 'PRODUCT' } }),
      prisma.serviceOffering.count({ where: { isActive: true } }),
      prisma.product.count({ where: { published: true, type: 'RENTAL' } }),
      prisma.event.count({ where: { eventDate: { gte: new Date() } } }),
      prisma.plan.count({ where: { published: true } }),
      prisma.request.count({ where: { isPublic: true } }),
      prisma.forumPost.count(),
      prisma.forumReply.count(),
      prisma.barterOffer.count(),
      prisma.appointment.count(),
    ])

    return NextResponse.json({ members, shops, schools, products, services, rentals, events, plans, requests, forumPosts, forumReplies, offers, appointments })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ members: 0, shops: 0, schools: 0, products: 0, services: 0, rentals: 0, events: 0, plans: 0, requests: 0, forumPosts: 0, forumReplies: 0 })
  }
}
