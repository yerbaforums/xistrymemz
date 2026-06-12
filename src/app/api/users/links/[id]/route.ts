import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userLinkSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const link = await prisma.userLink.findUnique({
      where: { id }
    })

    if (!link || link.userId !== session.user.id) {
      return apiError("Not found", 404)
    }

    const body = await request.json()
    const validation = userLinkSchema.partial().safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { type, url, label, icon, sortOrder } = validation.data

    const updated = await prisma.userLink.update({
      where: { id },
      data: {
        type: type ?? link.type,
        url: url ?? link.url,
        label: label !== undefined ? label : link.label,
        icon: icon !== undefined ? icon : link.icon,
        sortOrder: sortOrder !== undefined ? sortOrder : link.sortOrder
      }
    })

    return apiSuccess({ link: updated })
  } catch (error) {
    console.error('Error updating link:', error)
    return apiError("Failed to update link", 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const link = await prisma.userLink.findUnique({
      where: { id }
    })

    if (!link || link.userId !== session.user.id) {
      return apiError("Not found", 404)
    }

    await prisma.userLink.delete({
      where: { id }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error deleting link:', error)
    return apiError("Failed to delete link", 500)
  }
}
