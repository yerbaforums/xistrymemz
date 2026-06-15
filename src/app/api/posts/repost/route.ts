import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const { postId } = await request.json()
    if (!postId) {
      return apiError("postId is required", 400)
    }

    const repost = await prisma.postRepost.findFirst({
      where: { userId: session.user.id, originalPostId: postId },
      select: { postId: true },
    })

    if (!repost) {
      return apiError("Repost not found", 404)
    }

    await prisma.post.delete({ where: { id: repost.postId } })

    return apiSuccess({ success: true })
  } catch {
    return apiError("Failed to remove repost", 500)
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const { postId } = await request.json()
    if (!postId) {
      return apiError("postId is required", 400)
    }

    const original = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    })

    if (!original) {
      return apiError("Original post not found", 404)
    }

    const existing = await prisma.postRepost.findUnique({
      where: { userId_originalPostId: { userId: session.user.id, originalPostId: postId } },
    })
    if (existing) return apiError("Already reposted", 409)

    const post = await prisma.$transaction(async (tx) => {
      const p = await tx.post.create({
        data: {
          content: '',
          userId: session.user.id,
          context: 'REPOST',
          referenceType: 'POST',
          referenceId: postId,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      })
      await tx.postRepost.create({
        data: {
          userId: session.user.id,
          postId: p.id,
          originalPostId: postId,
        },
      })
      return p
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return apiError("Failed to repost", 500)
  }
}
