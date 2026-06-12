import { apiSuccess, apiError, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getBaseUrl, escapeHtml } from '@/lib/federation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, federatedUrl: true }
  })
  if (!user) {
    return apiError("User not found", 404)
  }

  const posts = await prisma.forumPost.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: {
      author: { select: { username: true, name: true, federatedUrl: true } },
      category: { select: { name: true } }
    }
  })

  const total = await prisma.forumPost.count({ where: { authorId: userId } })
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const baseUrl = getBaseUrl()

  const items = posts.map(post => ({
    id: `${baseUrl}/api/fediverse/activity/${post.id}`,
    type: 'Create' as const,
    actor: user.federatedUrl,
    published: post.createdAt.toISOString(),
    object: {
      id: `${baseUrl}/api/fediverse/note/${post.id}`,
      type: 'Note' as const,
      attributedTo: user.federatedUrl,
      content: `<p>${escapeHtml(post.content)}</p>`,
      published: post.createdAt.toISOString(),
      tag: post.category ? [{ type: 'Hashtag' as const, name: `#${post.category.name}` }] : [],
      to: ['https://www.w3.org/ns/activitystreams#Public']
    },
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [`${user.federatedUrl}/followers`]
  }))

  const outboxUrl = `${baseUrl}/api/fediverse/outbox/${userId}`

  const collection: Record<string, unknown> = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: outboxUrl,
    type: 'OrderedCollection',
    totalItems: total,
    first: `${outboxUrl}?page=1`,
    last: `${outboxUrl}?page=${totalPages}`
  }

  if (page <= totalPages) {
    collection.partOf = outboxUrl
    collection.orderedItems = items
  }

  return NextResponse.json(collection, {
    headers: { 'Content-Type': 'application/activity+json; charset=utf-8' }
  })
}
