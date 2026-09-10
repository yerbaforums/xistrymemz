import type { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const take = Math.min(Math.max(1, parseInt(searchParams.get('take') || '8')), 12)

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        location: true,
        userClass: true,
        createdAt: true,
        _count: { select: { posts: true, products: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    const members = users
      .filter(u => u.name || u.username)
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        image: u.image,
        location: u.location,
        userClass: u.userClass,
        createdAt: u.createdAt,
        posts: u._count.posts,
        products: u._count.products,
      }))

    return apiSuccess({ members })
  } catch (error) {
    return apiServerError(error)
  }
}