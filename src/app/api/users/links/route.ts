import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userLinkSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const links = await prisma.userLink.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' }
    })

    return apiSuccess({ links })
  } catch (error) {
    console.error('Error fetching links:', error)
    return apiError("Failed to fetch links", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const validation = userLinkSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { type, url, label, icon, sortOrder } = validation.data

    const link = await prisma.userLink.create({
      data: {
        userId: session.user.id,
        type,
        url,
        label: label || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0
      }
    })

    return apiSuccess({ link })
  } catch (error) {
    console.error('Error creating link:', error)
    return apiError("Failed to create link", 500)
  }
}
