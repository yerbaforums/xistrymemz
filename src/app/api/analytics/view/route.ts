import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

const VIEW_COOLDOWN_MS = 5 * 60 * 1000 // 5 min

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + 'xistrymemz-viewsalt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { contentType, contentId } = body

    if (!contentType || !contentId) {
      return apiError("Missing contentType or contentId", 400)
    }

    if (!['post', 'product', 'service', 'request'].includes(contentType)) {
      return apiError("Invalid contentType", 400)
    }

    const ipHash = await hashIP((await headers()).get('x-forwarded-for') || 'unknown')
    const userAgent = (await headers()).get('user-agent') || null

    const modelMap: Record<string, { model: any; viewCountField: string; relationName: string }> = {
      post: {
        model: prisma.post,
        viewCountField: 'viewCount',
        relationName: 'PostViews',
      },
      product: {
        model: prisma.product,
        viewCountField: 'viewCount',
        relationName: 'ProductViews',
      },
      service: {
        model: prisma.serviceOffering,
        viewCountField: 'viewCount',
        relationName: 'ServiceOfferingViews',
      },
      request: {
        model: prisma.request,
        viewCountField: 'viewCount',
        relationName: 'RequestViews',
      },
    }

    const entry = modelMap[contentType]
    if (!entry) return apiError("Invalid type", 400)

    // Check cooldown (authenticated users: 1 view per 5 min per item)
    if (session?.user?.id) {
      const recent = await prisma.contentView.findFirst({
        where: {
          userId: session.user.id,
          postId: contentType === 'post' ? contentId : undefined,
          productId: contentType === 'product' ? contentId : undefined,
          serviceOfferingId: contentType === 'service' ? contentId : undefined,
          requestId: contentType === 'request' ? contentId : undefined,
          createdAt: { gte: new Date(Date.now() - VIEW_COOLDOWN_MS) },
        },
      })
      if (recent) {
        return apiSuccess({ counted: false })
      }
    }

    // Record the view
    const data: Record<string, any> = {
      userId: session?.user?.id || null,
      ipHash: session?.user?.id ? null : ipHash,
      userAgent,
    }
    if (contentType === 'post') data.postId = contentId
    else if (contentType === 'product') data.productId = contentId
    else if (contentType === 'service') data.serviceOfferingId = contentId
    else if (contentType === 'request') data.requestId = contentId

    await Promise.all([
      prisma.contentView.create({ data }),
      entry.model.update({
        where: { id: contentId },
        data: { viewCount: { increment: 1 } },
      }),
    ])

    return apiSuccess({ counted: true })
  } catch (error) {
    console.error('Error recording view:', error)
    return apiError("Failed to record view", 500)
  }
}
