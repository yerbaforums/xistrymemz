import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/federation'

export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get('resource')
  if (!resource || !resource.startsWith('acct:')) {
    return NextResponse.json({ error: 'Invalid resource' }, { status: 400 })
  }

  const fullHandle = resource.slice(5)
  const parts = fullHandle.split('@')
  if (parts.length !== 2) {
    return NextResponse.json({ error: 'Invalid handle format' }, { status: 400 })
  }

  const [username, domain] = parts
  if (domain !== new URL(getBaseUrl()).hostname) {
    return NextResponse.json({ error: 'Unknown domain' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user?.federatedUrl) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const jrd = {
    subject: resource,
    aliases: [user.federatedUrl],
    links: [
      { rel: 'self', type: 'application/activity+json', href: user.federatedUrl },
      { rel: 'http://webfinger.net/rel/profile-page', type: 'text/html', href: `${getBaseUrl()}/profile/${username}` }
    ]
  }

  return NextResponse.json(jrd, {
    headers: { 'Content-Type': 'application/jrd+json; charset=utf-8' }
  })
}
