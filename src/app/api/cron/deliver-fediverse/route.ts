import { apiSuccess, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { deliverToInbox } from '@/lib/federation'

export async function GET() {
  const pending = await prisma.outboxActivity.findMany({
    where: {
      status: 'PENDING',
      retryCount: { lt: 3 },
      createdAt: { gte: new Date(Date.now() - 86400000) }
    },
    take: 50
  })

  let delivered = 0
  let failed = 0

  for (const activity of pending) {
    const followers = await prisma.follow.findMany({
      where: {
        followedId: activity.userId,
        status: 'ACCEPTED',
        remoteInboxUrl: { not: null }
      }
    })

    if (followers.length === 0) {
      await prisma.outboxActivity.update({
        where: { id: activity.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      })
      delivered++
      continue
    }

    const user = await prisma.user.findUnique({
      where: { id: activity.userId },
      select: { privateKey: true, federatedUrl: true }
    })
    if (!user?.privateKey || !user?.federatedUrl) {
      await prisma.outboxActivity.update({
        where: { id: activity.id },
        data: { status: 'FAILED', lastError: 'Missing keys' }
      })
      failed++
      continue
    }

    const serialized = JSON.parse(activity.serialized)
    const keyId = `${user.federatedUrl}#main-key`
    let allOk = true

    for (const follower of followers) {
      const ok = await deliverToInbox(follower.remoteInboxUrl!, serialized, user.privateKey, keyId)
      if (!ok) allOk = false
    }

    await prisma.outboxActivity.update({
      where: { id: activity.id },
      data: {
        status: allOk ? 'DELIVERED' : 'FAILED',
        deliveredAt: allOk ? new Date() : null,
        retryCount: { increment: 1 },
        lastError: allOk ? null : 'Delivery failed'
      }
    })

    if (allOk) delivered++
    else failed++
  }

  return NextResponse.json({ delivered, failed, remaining: pending.length })
}
