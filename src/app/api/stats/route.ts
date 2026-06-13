import { prisma } from '@/lib/prisma'
import { apiSuccess, apiServerError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [members, shops, schools, products, services, rentals, events, plans, requests, forumPosts, forumReplies, offers, appointments, boards] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { shopSlug: { not: null } } }),
      prisma.user.count({ where: { schoolSlug: { not: null } } }),
      prisma.product.count({ where: { published: true, type: 'PRODUCT' } }),
      prisma.serviceOffering.count({ where: { isActive: true } }),
      prisma.product.count({ where: { published: true, type: 'RENTAL' } }),
      prisma.event.count({ where: { eventDate: { gte: new Date() } } }),
      prisma.project.count({ where: { published: true } }),
      prisma.request.count({ where: { isPublic: true } }),
      prisma.forumPost.count(),
      prisma.forumReply.count(),
      prisma.barterOffer.count(),
      prisma.appointment.count(),
      prisma.bulletinBoard.count({ where: { isPublic: true } }),
    ])

    return apiSuccess({ members, shops, schools, products, services, rentals, events, projects: plans, requests, forumPosts, forumReplies, offers, appointments, boards })
  } catch (error) {
    return apiServerError(error)
  }
}
