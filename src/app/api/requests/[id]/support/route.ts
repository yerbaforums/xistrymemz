import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params

    const req = await prisma.request.findUnique({ where: { id: params.id } })
    if (!req) {
      return apiError("Request not found", 404)
    }

    const supports = await prisma.requestSupport.findMany({
      where: { requestId: params.id },
      include: {
        user: {
          select: { id: true, name: true, username: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess({ supports })
  } catch (error) {
    console.error('GET /api/requests/[id]/support:', error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const req = await prisma.request.findUnique({ where: { id: params.id } })
    if (!req) {
      return apiError("Request not found", 404)
    }

    const existing = await prisma.requestSupport.findUnique({
      where: { requestId_userId: { requestId: params.id, userId: session.user.id } }
    })

    if (existing) {
      await prisma.requestSupport.delete({
        where: { requestId_userId: { requestId: params.id, userId: session.user.id } }
      })
      const count = await prisma.requestSupport.count({ where: { requestId: params.id } })
      return NextResponse.json({ removed: true, count })
    }

    const body = await request.json()
    const message = body?.message || null

    const support = await prisma.requestSupport.create({
      data: {
        requestId: params.id,
        userId: session.user.id,
        message
      }
    })

    const count = await prisma.requestSupport.count({ where: { requestId: params.id } })
    return NextResponse.json({ support, count }, { status: 201 })
  } catch (error) {
    console.error('POST /api/requests/[id]/support:', error)
    return apiError("Internal server error", 500)
  }
}
