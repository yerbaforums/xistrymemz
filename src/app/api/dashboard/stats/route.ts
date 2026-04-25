import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [plans, requests, products, school, joinedEvents] = await Promise.all([
      prisma.plan.findMany({ where: { userId: session.user.id }, select: { id: true } }),
      prisma.request.findMany({
        where: { OR: [{ userId: session.user.id }, { plan: { userId: session.user.id } }] },
        select: { id: true, status: true }
      }),
      prisma.product.findMany({ where: { userId: session.user.id }, select: { id: true, published: true } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { schoolName: true, schoolSlug: true, shopName: true, shopSlug: true, schoolContentsOwned: { select: { id: true } } }
      }),
      prisma.eventJoiner.findMany({
        where: { userId: session.user.id },
        include: { event: { select: { id: true, title: true, eventDate: true, location: true, planId: true } } }
      })
    ])

    return NextResponse.json({
      totalPlans: plans.length,
      pendingRequests: requests.filter(r => r.status === 'PENDING').length,
      completedRequests: requests.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length,
      activeListings: products.filter(p => p.published).length,
      hasSchool: !!school?.schoolName,
      schoolContentCount: school?.schoolContentsOwned.length || 0,
      hasShop: !!school?.shopName,
      schoolSlug: school?.schoolSlug,
      shopSlug: school?.shopSlug,
      joinedEventsCount: joinedEvents.length
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}