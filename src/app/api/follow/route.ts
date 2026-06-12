import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBaseUrl, actorUrl, deliverToInbox } from '@/lib/federation'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { followedId } = await request.json()
    if (!followedId) return apiError('followedId required', 400)
    if (followedId === session.user.id) return apiError('Cannot follow yourself', 400)

    const followed = await prisma.user.findUnique({ where: { id: followedId }, select: { id: true, inboxUrl: true, username: true } })
    if (!followed) return apiError('User not found', 404)

    const existing = await prisma.follow.findUnique({
      where: { followerId_followedId: { followerId: session.user.id, followedId } },
    })
    if (existing) return apiError('Already following', 409)

    const follow = await prisma.follow.create({
      data: { followerId: session.user.id, followedId },
    })

    // Send ActivityPub Follow to remote user's inbox
    if (followed.inboxUrl) {
      const follower = await prisma.user.findUnique({ where: { id: session.user.id }, select: { privateKey: true, username: true } })
      if (follower?.privateKey && follower?.username) {
        const activity = {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Follow',
          actor: actorUrl(follower.username),
          object: actorUrl(followed.username!),
        }
        deliverToInbox(followed.inboxUrl, activity, follower.privateKey, `${actorUrl(follower.username)}#main-key`)
      }
    }

    return apiSuccess(follow, 201)
  } catch (error) {
    return apiServerError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { searchParams } = new URL(request.url)
    const followedId = searchParams.get('followedId')
    if (!followedId) return apiError('followedId required', 400)

    await prisma.follow.deleteMany({
      where: { followerId: session.user.id, followedId },
    })

    return apiSuccess({ unfollowed: true })
  } catch (error) {
    return apiServerError(error)
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followedId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ])

    return apiSuccess({ followers, following })
  } catch (error) {
    return apiServerError(error)
  }
}
