import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPin } from '@/lib/boardService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { slug } = await params

  try {
    const board = await prisma.bulletinBoard.findUnique({ where: { slug } })
    if (!board) {
      return apiError("Board not found", 404)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const { title, content, images, entityType, entityId, entityTitle, entityImage, contactName, contactEmail, contactPhone, category, expiresAt, latitude, longitude } = body as any

    if (!content) {
      return apiError("Content is required", 400)
    }

    const pin = await createPin({
      boardId: board.id,
      userId: session.user.id,
      title,
      content,
      images,
      entityType,
      entityId,
      entityTitle,
      entityImage,
      contactName,
      contactEmail,
      contactPhone,
      category,
      expiresAt,
      latitude,
      longitude,
    })

    return NextResponse.json(pin, { status: 201 })
  } catch (error) {
    console.error('POST /api/boards/[slug]/pins:', error)
    return apiError("Internal server error", 500)
  }
}
