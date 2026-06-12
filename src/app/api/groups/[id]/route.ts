import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true, email: true, username: true } } }
        },
        posts: {
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: 20,
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        },
        groupBuys: {
          include: {
            organizer: { select: { id: true, name: true, image: true } },
            _count: { select: { supporters: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { comments: true, fulfillments: true } }
          }
        },
        groupProducts: {
          include: {
            product: {
              include: {
                user: { select: { id: true, name: true, image: true } }
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        },
        _count: { select: { members: true, posts: true } }
      }
    })

    if (!group) {
      return apiError("Group not found", 404)
    }

    const isMember = userId ? group.members.some(m => m.userId === userId) : false
    const isAdmin = userId ? group.members.some(m => m.userId === userId && m.role === 'ADMIN') : false

    const marketplaceProducts = group.groupProducts.map(gp => ({
      ...gp.product,
      user: gp.product.user
    }))

    const { groupProducts, ...rest } = group

    return NextResponse.json({ ...rest, marketplaceProducts, isMember, isAdmin })
  } catch (error) {
    console.error('GET /api/groups/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const { name, description, imageUrl, coverImage, bannerColor, isPrivate, hashtags } = body as any

    const member = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id, role: 'ADMIN' }
    })

    if (!member) {
      return apiError("Only admins can update the group", 403)
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (imageUrl !== undefined) data.imageUrl = imageUrl
    if (coverImage !== undefined) data.coverImage = coverImage
    if (bannerColor !== undefined) data.bannerColor = bannerColor
    if (isPrivate !== undefined) data.isPrivate = isPrivate

    const group = await prisma.group.update({
      where: { id },
      data
    })

    if (Array.isArray(hashtags)) {
      await linkHashtags('GROUP', id, hashtags)
    } else {
      const groupName = name || group.name
      const groupDesc = description || group.description || ''
      await extractAndLinkHashtags(groupName + ' ' + groupDesc, 'GROUP', id)
    }

    return apiSuccess(group)
  } catch (error) {
    console.error('PUT /api/groups/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const group = await prisma.group.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!group) {
      return apiError("Group not found", 404)
    }

    if (group.userId !== session.user.id) {
      return apiError("Only the creator can delete the group", 403)
    }

    await prisma.group.delete({ where: { id } })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/groups/[id]:', error)
    return apiError("Internal server error", 500)
  }
}
