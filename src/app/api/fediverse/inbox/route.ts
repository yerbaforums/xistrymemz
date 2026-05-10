import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function handleFollow(actorUrl: string, objectId: string) {
  const followedUser = await prisma.user.findFirst({ where: { federatedUrl: objectId } })
  if (!followedUser) return

  const sender = await prisma.user.findFirst({ where: { federatedUrl: actorUrl } })
  if (sender) {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followedId: { followerId: sender.id, followedId: followedUser.id } }
    })
    if (!existing) {
      const domain = new URL(actorUrl).hostname
      await prisma.follow.create({
        data: {
          followerId: sender.id,
          followedId: followedUser.id,
          remoteActorUrl: actorUrl,
          remoteInboxUrl: `${new URL(actorUrl).origin}/api/fediverse/inbox`,
          status: 'ACCEPTED'
        }
      })
      await prisma.user.update({
        where: { id: sender.id },
        data: { followingCount: { increment: 1 } }
      })
      await prisma.user.update({
        where: { id: followedUser.id },
        data: { followersCount: { increment: 1 } }
      })
    }
  } else {
    await prisma.follow.create({
      data: {
        followerId: '__remote__',
        followedId: followedUser.id,
        remoteActorUrl: actorUrl,
        remoteInboxUrl: `${new URL(actorUrl).origin}/api/fediverse/inbox`,
        status: 'PENDING'
      }
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const activityId = body.id || `urn:uuid:${crypto.randomUUID()}`
    const type = body.type
    const actor = body.actor
    const object = body.object

    const existing = await prisma.inboxActivity.findUnique({ where: { activityId } })
    if (existing) {
      return NextResponse.json({ status: 'duplicate' })
    }

    await prisma.inboxActivity.create({
      data: {
        activityId,
        type,
        actor: actor || '',
        objectId: typeof object === 'string' ? object : object?.id,
        raw: JSON.stringify(body)
      }
    })

    switch (type) {
      case 'Follow':
        const objectId = typeof object === 'string' ? object : object?.id
        if (objectId) await handleFollow(actor, objectId)
        break
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Inbox error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
