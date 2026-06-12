import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { postId, replyId, type } = body

    if (type === 'post' && postId) {
      await prisma.forumPost.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } }
      })
      return apiSuccess({ success: true })
    }

    if (type === 'reply' && replyId) {
      return apiSuccess({ success: true })
    }

    return apiError("Invalid parameters", 400)
  } catch (error) {
    console.error('Error tracking view:', error)
    return apiError("Failed to track view", 500)
  }
}