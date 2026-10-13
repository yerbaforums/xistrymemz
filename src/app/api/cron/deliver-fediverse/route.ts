import { NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { deliverToInbox } from '@/lib/federation'

function authorized(request: Request): boolean {
  const required = process.env.CRON_SECRET
  if (!required) return true
  const url = new URL(request.url)
  return url.searchParams.get('secret') === required
}

// GET /api/cron/deliver-fediverse — flush pending Fediverse deliveries.
// Guarded by CRON_SECRET: this signs activities with users' private keys.
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pending = await prisma.outboxActivity.findMany({
    where: {
      status: 'PENDING',
      retryCount: { lt: 3 },
      createdAt: { gte: new Date(Date.now() - 86400000) }
    },
    take: 50
  })

  // Batch the per-activity lookups into two queries instead of N×2.
  // Followers are grouped by followedId; users are keyed by id.
  const activityUserIds = pending.map(a => a.userId)
  const [followRows, userRows] = await Promise.all([
    prisma.follow.findMany({
      where: {
        followedId: { in: activityUserIds },
        status: 'ACCEPTED',
        remoteInboxUrl: { not: null }
      },
      select: { followedId: true, remoteInboxUrl: true }
    }),
    prisma.user.findMany({
      where: { id: { in: activityUserIds } },
      select: { id: true, privateKey: true, federatedUrl: true }
    }),
  ])

  const remoteInboxByUser = new Map<string, string[]>()
  for (const row of followRows) {
    const list = remoteInboxByUser.get(row.followedId) || []
    list.push(row.remoteInboxUrl!)
    remoteInboxByUser.set(row.followedId, list)
  }
  const userById = new Map(userRows.map(u => [u.id, u]))

  let delivered = 0
  let failed = 0

  for (const activity of pending) {
    const remoteInboxUrls = remoteInboxByUser.get(activity.userId) || []

    if (remoteInboxUrls.length === 0) {
      await prisma.outboxActivity.update({
        where: { id: activity.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      })
      delivered++
      continue
    }

    const user = userById.get(activity.userId)
    if (!user?.privateKey || !user?.federatedUrl) {
      await prisma.outboxActivity.update({
        where: { id: activity.id },
        data: { status: 'FAILED', lastError: 'Missing keys' }
      })
      failed++
      continue
    }

    let serialized: Record<string, unknown>
    try {
      serialized = JSON.parse(activity.serialized) as Record<string, unknown>
    } catch {
      await prisma.outboxActivity.update({
        where: { id: activity.id },
        data: { status: 'FAILED', lastError: 'Bad payload' }
      })
      failed++
      continue
    }
    const keyId = `${user.federatedUrl}#main-key`
    let allOk = true

    for (const inboxUrl of remoteInboxUrls) {
      const ok = await deliverToInbox(inboxUrl, serialized, user.privateKey, keyId)
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
