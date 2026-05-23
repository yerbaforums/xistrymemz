import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const today = startOfToday()
    const sevenDaysAgo = daysAgo(7)
    const thirtyDaysAgo = daysAgo(30)

    const [
      totalUsers,
      usersCreated7d,
      usersCreated30d,
      activeToday,
      activeWeek,
      totalPosts,
      totalProducts,
      totalServices,
      totalRentals,
      totalRequests,
      totalConnections,
      totalGroups,
      totalEvents,
      totalSchools,
      postViewsAgg,
      productViewsAgg,
      serviceViewsAgg,
      requestViewsAgg,
      viewsToday,
      views7d,
      views30d,
      usersByClass,
      usersByRole,
      productCategoryCounts,
      serviceCategoryCounts,
      dailyViewsRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.contentView.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: today }, userId: { not: null } },
      }).then(r => r.length),
      prisma.contentView.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } },
      }).then(r => r.length),
      prisma.post.count(),
      prisma.product.count({ where: { type: 'PRODUCT' } }),
      prisma.serviceOffering.count(),
      prisma.product.count({ where: { type: 'RENTAL' } }),
      prisma.request.count(),
      prisma.connection.count({ where: { status: 'ACCEPTED' } }),
      prisma.group.count(),
      prisma.event.count(),
      prisma.schoolContent.count(),
      prisma.post.aggregate({ _sum: { viewCount: true } }),
      prisma.product.aggregate({ _sum: { viewCount: true } }),
      prisma.serviceOffering.aggregate({ _sum: { viewCount: true } }),
      prisma.request.aggregate({ _sum: { viewCount: true } }),
      prisma.contentView.count({ where: { createdAt: { gte: today } } }),
      prisma.contentView.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.contentView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.groupBy({
        by: ['userClass'],
        _count: true,
        orderBy: { _count: { userClass: 'desc' } },
        where: { userClass: { not: null } },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        where: { type: 'PRODUCT', category: { not: null } },
      }),
      prisma.serviceOffering.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        where: { category: { not: undefined } },
      }),
      prisma.contentView.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }).then(rows => {
        const byDate: Record<string, number> = {}
        for (const r of rows) {
          const key = r.createdAt.toISOString().slice(0, 10)
          byDate[key] = (byDate[key] || 0) + 1
        }
        return Object.entries(byDate).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
      }),
    ])

    // Top content
    const [topPosts, topProducts, topServices, topRequests, topUsersRaw] = await Promise.all([
      prisma.post.findMany({
        orderBy: { viewCount: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true, image: true, username: true } } },
      }),
      prisma.product.findMany({
        where: { type: 'PRODUCT' },
        orderBy: { viewCount: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.serviceOffering.findMany({
        orderBy: { viewCount: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.request.findMany({
        orderBy: { viewCount: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.user.findMany({
        orderBy: { posts: { _count: 'desc' } },
        take: 10,
        select: {
          id: true, name: true, image: true, userClass: true,
          _count: { select: { posts: true, sentConnections: true } },
        },
      }),
    ])

    const topUsers = topUsersRaw.map(u => ({
      id: u.id, name: u.name, image: u.image, userClass: u.userClass,
      postCount: u._count.posts,
      connectionCount: u._count.sentConnections,
    }))

    // Daily content creation (last 30 days)
    const [dailyPosts, dailyProducts, dailyServices, dailyRequests] = await Promise.all([
      prisma.post.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.product.findMany({ where: { createdAt: { gte: thirtyDaysAgo }, type: 'PRODUCT' }, select: { createdAt: true } }),
      prisma.serviceOffering.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.request.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    ])

    const dailyContentMap: Record<string, { posts: number; products: number; services: number; requests: number }> = {}
    for (const p of dailyPosts) { const k = p.createdAt.toISOString().slice(0, 10); if (!dailyContentMap[k]) dailyContentMap[k] = { posts: 0, products: 0, services: 0, requests: 0 }; dailyContentMap[k].posts++ }
    for (const p of dailyProducts) { const k = p.createdAt.toISOString().slice(0, 10); if (!dailyContentMap[k]) dailyContentMap[k] = { posts: 0, products: 0, services: 0, requests: 0 }; dailyContentMap[k].products++ }
    for (const p of dailyServices) { const k = p.createdAt.toISOString().slice(0, 10); if (!dailyContentMap[k]) dailyContentMap[k] = { posts: 0, products: 0, services: 0, requests: 0 }; dailyContentMap[k].services++ }
    for (const p of dailyRequests) { const k = p.createdAt.toISOString().slice(0, 10); if (!dailyContentMap[k]) dailyContentMap[k] = { posts: 0, products: 0, services: 0, requests: 0 }; dailyContentMap[k].requests++ }

    const dailyContent = Object.entries(dailyContentMap).map(([date, counts]) => ({ date, ...counts })).sort((a, b) => a.date.localeCompare(b.date))

    // Daily active users (last 30 days) — unique userId per day from ContentView
    const dailyViewsRaw2 = await prisma.contentView.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
      select: { createdAt: true, userId: true },
    })
    const dauMap: Record<string, Set<string>> = {}
    for (const v of dailyViewsRaw2) {
      const k = v.createdAt.toISOString().slice(0, 10)
      if (!dauMap[k]) dauMap[k] = new Set()
      dauMap[k].add(v.userId!)
    }
    const dailyUsers = Object.entries(dauMap).map(([date, users]) => ({ date, count: users.size })).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsers7d: usersCreated7d,
        newUsers30d: usersCreated30d,
        activeToday,
        activeWeek,
        totalPosts,
        totalProducts,
        totalServices,
        totalRentals,
        totalRequests,
        totalViews: (postViewsAgg._sum.viewCount ?? 0) + (productViewsAgg._sum.viewCount ?? 0) + (serviceViewsAgg._sum.viewCount ?? 0) + (requestViewsAgg._sum.viewCount ?? 0),
        viewsToday,
        views7d,
        views30d,
        totalConnections,
        totalGroups,
        totalEvents,
        totalSchools,
      },
      usersByClass: usersByClass.map(r => ({ className: r.userClass, count: r._count })),
      usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count })),
      topPosts: topPosts.map(p => ({
        id: p.id, content: p.content.slice(0, 100), likes: p.likes, viewCount: p.viewCount,
        createdAt: p.createdAt.toISOString(),
        user: { id: p.user.id, name: p.user.name, image: p.user.image, username: p.user.username },
      })),
      topProducts: topProducts.map(p => ({
        id: p.id, title: p.title, price: p.price, type: p.type, viewCount: p.viewCount,
        user: { id: p.user.id, name: p.user.name },
      })),
      topServices: topServices.map(s => ({
        id: s.id, title: s.title, category: s.category, viewCount: s.viewCount,
        user: { id: s.user.id, name: s.user.name },
      })),
      topRequests: topRequests.map(r => ({
        id: r.id, title: r.title, status: r.status, viewCount: r.viewCount,
        user: { id: r.user.id, name: r.user.name },
      })),
      topUsers,
      productCategoryCounts: productCategoryCounts.map(r => ({ category: r.category, count: r._count })),
      serviceCategoryCounts: serviceCategoryCounts.map(r => ({ category: r.category, count: r._count })),
      dailyViews: dailyViewsRaw,
      dailyContent,
      dailyUsers,
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
