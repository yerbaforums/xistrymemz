import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [userCount, postCount] = await Promise.all([
    prisma.user.count(),
    prisma.forumPost.count()
  ])

  return NextResponse.json({
    version: '2.1',
    software: { name: 'xistrymemz', version: '0.7.0' },
    protocols: { inbound: ['activitypub'], outbound: ['activitypub'] },
    services: { inbound: [], outbound: [] },
    openRegistrations: true,
    usage: {
      users: { total: userCount, activeHalfyear: userCount, activeMonth: userCount },
      localPosts: postCount,
      localComments: 0
    },
    metadata: {
      nodeName: 'XistrYmemZ — The Cosmic Whitepages Cooperative',
      nodeDescription: 'A collaborative planning and community platform'
    }
  })
}
