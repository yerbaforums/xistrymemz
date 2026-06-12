import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/federation'
import crypto from 'crypto'

async function fetchActor(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/activity+json' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

function handleFromDomain(actorUrl: string): string {
  try { return new URL(actorUrl).hostname } catch { return 'unknown' }
}

async function handleFollow(actorUrl: string, objectId: string) {
  const followedUser = await prisma.user.findFirst({ where: { federatedUrl: objectId } })
  if (!followedUser) return

  // Check if this is a known local user following
  const sender = await prisma.user.findFirst({ where: { federatedUrl: actorUrl } })
  if (sender) {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followedId: { followerId: sender.id, followedId: followedUser.id } }
    })
    if (!existing) {
      const domain = new URL(actorUrl).hostname
      await prisma.follow.create({
        data: {
          followerId: sender.id, followedId: followedUser.id,
          remoteActorUrl: actorUrl,
          remoteInboxUrl: `${new URL(actorUrl).origin}/inbox`,
          status: 'ACCEPTED',
        }
      })
      await prisma.user.update({ where: { id: sender.id }, data: { followingCount: { increment: 1 } } })
      await prisma.user.update({ where: { id: followedUser.id }, data: { followersCount: { increment: 1 } } })
    }
    return
  }

  // Check if we already have a FederatedIdentity for this actor
  let identity = await prisma.federatedIdentity.findUnique({ where: { actorUrl } })
  if (!identity) {
    // Fetch the remote actor's profile
    const actor = await fetchActor(actorUrl)
    if (!actor) return

    const preferredUsername = (actor.preferredUsername as string) || ''
    const domain = handleFromDomain(actorUrl)
    const handle = `@${preferredUsername}@${domain}`
    const name = (actor.name as string) || preferredUsername
    const inboxUrl = (actor.inbox as string) || ''
    const sharedInbox = (actor.sharedInbox as string) || null
    const pubKey = (actor.publicKey as Record<string, unknown>)?.publicKeyPem as string || null

    // Try to find remote user by handle, or create a lightweight account
    const domainSlug = domain.replace(/[^a-z0-9]/g, '-').slice(0, 20)
    const username = `${preferredUsername.toLowerCase()}_${domainSlug}`.replace(/[^a-z0-9_]/g, '')

    const newUser = await prisma.user.upsert({
      where: { federatedUrl: actorUrl },
      update: {},
      create: {
        name,
        username,
        federatedUrl: actorUrl,
        inboxUrl,
        publicKey: pubKey,
        password: '', // remote users have no password
        email: `${preferredUsername}@${domain}`, // placeholder email
      },
    })

    identity = await prisma.federatedIdentity.create({
      data: {
        userId: newUser.id,
        handle,
        actorUrl,
        inboxUrl,
        sharedInboxUrl: sharedInbox,
        publicKeyPem: pubKey,
        remoteInstanceUrl: `https://${domain}`,
        verifiedAt: new Date(),
      },
    })
  }

  // Create the follow relationship
  const existingFollow = await prisma.follow.findUnique({
    where: { followerId_followedId: { followerId: identity.userId!, followedId: followedUser.id } }
  })
  if (!existingFollow && identity.userId) {
    await prisma.follow.create({
      data: {
        followerId: identity.userId,
        followedId: followedUser.id,
        remoteActorUrl: actorUrl,
        remoteInboxUrl: `${new URL(actorUrl).origin}/inbox`,
        status: 'ACCEPTED',
      }
    })
    await prisma.user.update({ where: { id: identity.userId }, data: { followingCount: { increment: 1 } } })
    await prisma.user.update({ where: { id: followedUser.id }, data: { followersCount: { increment: 1 } } })
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
    if (existing) return apiSuccess({ status: 'duplicate' })

    await prisma.inboxActivity.create({
      data: { activityId, type, actor: actor || '', objectId: typeof object === 'string' ? object : object?.id, raw: JSON.stringify(body) },
    })

    const objectId = typeof object === 'string' ? object : object?.id

    switch (type) {
      case 'Follow':
        if (objectId) await handleFollow(actor, objectId)
        break

      case 'Like': {
        // Remote user liked a local post
        if (!objectId) break
        const likedPost = await prisma.forumPost.findFirst({ where: { OR: [{ id: objectId }, { federatedUrl: objectId }] } })
        if (likedPost) await prisma.forumPost.update({ where: { id: likedPost.id }, data: { likes: { increment: 1 } } })
        break
      }

      case 'Announce':
      case 'Create': {
        // Remote user boosted/shared a local post
        if (!objectId) break
        const announcedPost = await prisma.forumPost.findFirst({ where: { OR: [{ id: objectId }, { federatedUrl: objectId }] } })
        if (announcedPost) await prisma.forumPost.update({ where: { id: announcedPost.id }, data: { reposts: { increment: 1 } } })
        break
      }

      case 'Undo': {
        // Undo Follow, Like, etc.
        const undoType = body.object?.type
        const undoObject = body.object?.object
        if (undoType === 'Follow' && undoObject) {
          const unfollowedUser = await prisma.user.findFirst({ where: { federatedUrl: undoObject } })
          const unfollower = await prisma.user.findFirst({ where: { federatedUrl: actor } })
          if (unfollowedUser && unfollower) {
            await prisma.follow.deleteMany({
              where: { followerId: unfollower.id, followedId: unfollowedUser.id },
            })
            await prisma.user.update({ where: { id: unfollower.id }, data: { followingCount: { decrement: 1 } } })
            await prisma.user.update({ where: { id: unfollowedUser.id }, data: { followersCount: { decrement: 1 } } })
          }
        } else if (undoType === 'Like' && undoObject) {
          const unlikedPost = await prisma.forumPost.findFirst({ where: { OR: [{ id: undoObject }, { federatedUrl: undoObject }] } })
          if (unlikedPost) await prisma.forumPost.update({ where: { id: unlikedPost.id }, data: { likes: { decrement: 1 } } })
        }
        break
      }

      case 'Delete': {
        // Remote user deleted their account — clean up
        const identity = await prisma.federatedIdentity.findUnique({ where: { actorUrl: actor } })
        if (identity?.userId) {
          await prisma.follow.deleteMany({ where: { followerId: identity.userId } })
          await prisma.follow.deleteMany({ where: { followedId: identity.userId } })
          await prisma.federatedIdentity.delete({ where: { id: identity.id } })
        }
        break
      }
    }

    return apiSuccess({ status: 'ok' })
  } catch (error) {
    console.error('Inbox error:', error)
    return apiSuccess({ status: 'error' })
  }
}
