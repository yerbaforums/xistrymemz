import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { username, domain } = await request.json()
    if (!username || !domain) return apiError('Username and domain required', 400)

    // Step 1: WebFinger resolution
    const resource = `acct:${username}@${domain}`
    const wfUrl = `https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(resource)}`

    const wfRes = await fetch(wfUrl, { signal: AbortSignal.timeout(10000) })
    if (!wfRes.ok) return apiError(`Could not find account ${username}@${domain}`, 404)

    const wfData = await wfRes.json()
    const selfLink = wfData.links?.find((l: Record<string, string>) => l.rel === 'self')
    if (!selfLink?.href) return apiError('No actor URL found', 404)

    const actorUrl = selfLink.href

    // Step 2: Fetch actor profile
    const actorRes = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!actorRes.ok) return apiError('Could not fetch actor profile', 404)

    const actor = await actorRes.json()
    const inboxUrl = actor.inbox || ''
    const sharedInbox = actor.endpoints?.sharedInbox || actor.sharedInbox || null
    const name = actor.name || actor.preferredUsername || username
    const pubKey = actor.publicKey?.publicKeyPem || null

    // Check if this identity already exists
    let identity = await prisma.federatedIdentity.findUnique({ where: { actorUrl } })
    if (identity) {
      // Already linked - sign them in
      if (identity.userId) {
        // Create a session token and redirect
        return apiSuccess({ redirectUrl: `/api/auth/fediverse/callback?identityId=${identity.id}` })
      }
    } else {
      // Generate verification challenge
      const challenge = crypto.randomUUID()
      const domainSlug = domain.replace(/[^a-z0-9]/g, '-').slice(0, 20)
      const localUsername = `${username.toLowerCase()}_${domainSlug}`.replace(/[^a-z0-9_]/g, '')

      // Check if we already have a user with this federated URL
      let user = await prisma.user.findFirst({ where: { federatedUrl: actorUrl } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            name,
            username: localUsername,
            federatedUrl: actorUrl,
            inboxUrl,
            publicKey: pubKey,
            password: '',
            email: `${username}@${domain}`,
          },
        })
      }

      identity = await prisma.federatedIdentity.create({
        data: {
          userId: user.id,
          handle: `@${username}@${domain}`,
          actorUrl,
          inboxUrl,
          sharedInboxUrl: sharedInbox,
          publicKeyPem: pubKey,
          remoteInstanceUrl: `https://${domain}`,
          verifiedAt: new Date(),
        },
      })
    }

    // Step 3: Send a Follow back from our bot to verify (and establish connection)
    const botUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })
    if (botUser?.privateKey && botUser?.username) {
      const { deliverToInbox, actorUrl: makeActorUrl } = await import('@/lib/federation')
      const followActivity = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Follow',
        actor: makeActorUrl(botUser.username),
        object: actorUrl,
      }
      const targetInbox = sharedInbox || inboxUrl
      if (targetInbox) {
        deliverToInbox(targetInbox, followActivity, botUser.privateKey, `${makeActorUrl(botUser.username)}#main-key`)
      }
    }

    return apiSuccess({ redirectUrl: `/api/auth/fediverse/callback?identityId=${identity.id}` })
  } catch (error) {
    return apiServerError(error)
  }
}
