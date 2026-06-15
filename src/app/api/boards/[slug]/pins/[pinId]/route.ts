import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const { slug, pinId } = await params

  try {
    const board = await prisma.bulletinBoard.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } })
    if (!board) return apiError("Board not found", 404)

    const pin = await prisma.bulletinPin.findUnique({
      where: { id: pinId },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })
    if (!pin || pin.boardId !== board.id) return apiError("Pin not found", 404)

    return apiSuccess({
      ...pin,
      likeCount: pin._count.likes,
      commentCount: pin._count.comments,
      board: { id: board.id, name: board.name, slug: board.slug },
    })
  } catch (error) {
    console.error('GET /api/boards/[slug]/pins/[pinId]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { slug, pinId } = await params

  try {
    const board = await prisma.bulletinBoard.findUnique({ where: { slug } })
    if (!board) {
      return apiError("Board not found", 404)
    }

    const pin = await prisma.bulletinPin.findUnique({ where: { id: pinId } })
    if (!pin) {
      return apiError("Pin not found", 404)
    }

    const isOwner = pin.userId === session.user.id
    const isBoardOwner = board.ownerId === session.user.id
    if (!isOwner && !isBoardOwner) {
      return apiError("Forbidden", 403)
    }

    await prisma.bulletinPin.delete({ where: { id: pinId } })

    await prisma.bulletinBoard.update({
      where: { id: board.id },
      data: { pinCount: { decrement: 1 } },
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/boards/[slug]/pins/[pinId]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { slug, pinId } = await params

  try {
    const pin = await prisma.bulletinPin.findUnique({
      where: { id: pinId },
      include: { board: { select: { slug: true, ownerId: true } } },
    })
    if (!pin) {
      return apiError("Pin not found", 404)
    }
    if (pin.board.slug !== slug) {
      return apiError("Pin does not belong to this board", 400)
    }

    const isOwner = pin.userId === session.user.id
    const isBoardOwner = pin.board.ownerId === session.user.id
    if (!isOwner && !isBoardOwner) {
      return apiError("Forbidden", 403)
    }

    const body = await request.json()
    const allowed: Record<string, unknown> = {}
    if (body.title !== undefined) allowed.title = body.title
    if (body.content !== undefined) allowed.content = body.content
    if (body.contactName !== undefined) allowed.contactName = body.contactName
    if (body.contactEmail !== undefined) allowed.contactEmail = body.contactEmail
    if (body.contactPhone !== undefined) allowed.contactPhone = body.contactPhone
    if (body.category !== undefined) allowed.category = body.category
    if (body.expiresAt !== undefined) allowed.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (body.isPinned !== undefined && isBoardOwner) allowed.isPinned = body.isPinned
    if (body.pinOrder !== undefined && isBoardOwner) allowed.pinOrder = body.pinOrder

    const updated = await prisma.bulletinPin.update({
      where: { id: pinId },
      data: allowed,
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('PATCH /api/boards/[slug]/pins/[pinId]:', error)
    return apiError("Internal server error", 500)
  }
}
