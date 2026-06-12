import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true
          }
        }
      }
    })

    if (!post) {
      return apiError("Post not found", 404)
    }

    const likesCount = await prisma.postLike.count({
      where: { postId: id }
    })

    const session = await getServerSession(authOptions)
    let liked = false
    if (session?.user?.id) {
      const like = await prisma.postLike.findUnique({
        where: { userId_postId: { userId: session.user.id, postId: id } }
      })
      liked = !!like
    }

    const replyCount = await prisma.post.count({
      where: { parentId: id }
    })

    const repostCount = await prisma.postRepost.count({
      where: { originalPostId: id }
    })

    let reposted = false
    if (session?.user?.id) {
      const repost = await prisma.postRepost.findUnique({
        where: { userId_originalPostId: { userId: session.user.id, originalPostId: id } }
      })
      reposted = !!repost
    }

    const replies = await prisma.post.findMany({
      where: { parentId: id },
      include: {
        user: {
          select: { id: true, name: true, image: true, username: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ post, likes: likesCount, liked, replyCount, repostCount, reposted, replies })
  } catch (error) {
    console.error('Error fetching post:', error)
    return apiError("Failed to fetch post", 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const body = await request.json()
    const { likes, content } = body

    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      return apiError("Post not found", 404)
    }

    if (post.userId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        content: content !== undefined ? content : post.content,
        likes: likes !== undefined ? likes : post.likes
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true
          }
        }
      }
    })

    return apiSuccess({ post: updated })
  } catch (error) {
    console.error('Error updating post:', error)
    return apiError("Failed to update post", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const post = await prisma.post.findUnique({
      where: { id }
    })

    if (!post) {
      return apiError("Post not found", 404)
    }

    const isAuthor = post.userId === session.user.id
    const isWallOwner = post.targetUserId === session.user.id

    if (!isAuthor && !isWallOwner) {
      return apiError("Forbidden", 403)
    }

    await prisma.post.delete({
      where: { id }
    })

    return apiSuccess({ message: 'Post deleted' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return apiError("Failed to delete post", 500)
  }
}
