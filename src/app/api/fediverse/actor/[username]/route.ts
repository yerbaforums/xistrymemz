import { apiSuccess, apiError, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/federation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return apiError("Not found", 404)
  }

  const baseUrl = getBaseUrl()
  const actorUrl = `${baseUrl}/api/fediverse/actor/${username}`

  const actor: Record<string, unknown> = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
      { manuallyApprovesFollowers: 'as:manuallyApprovesFollowers' }
    ],
    id: actorUrl,
    type: 'Person',
    preferredUsername: username,
    name: user.name || username,
    summary: user.bio || '',
    url: `${baseUrl}/profile/${username}`,
    inbox: `${baseUrl}/api/fediverse/inbox`,
    outbox: `${baseUrl}/api/fediverse/outbox/${user.id}`,
    followers: `${actorUrl}/followers`,
    following: `${actorUrl}/following`,
    manuallyApprovesFollowers: false,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: user.publicKey || ''
    },
    published: user.createdAt.toISOString()
  }

  if (user.image) {
    actor.icon = { type: 'Image', url: user.image }
  }

  return NextResponse.json(actor, {
    headers: { 'Content-Type': 'application/activity+json; charset=utf-8' }
  })
}
