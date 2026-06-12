import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requestSchema, validateBody } from '@/lib/schemas'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get('public') === 'true'
    const planId = searchParams.get('planId')
    const groupId = searchParams.get('groupId')
    const productId = searchParams.get('productId')
    const schoolContentId = searchParams.get('schoolContentId')
    const eventId = searchParams.get('eventId')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const q = searchParams.get('q')

    const where: Record<string, unknown> = {}

    if (publicOnly) {
      where.OR = [
        { isPublic: true },
        { plan: { published: true } }
      ]
    } else if (session?.user?.id) {
      where.OR = [
        { userId: session.user.id },
        { plan: { userId: session.user.id } },
        { plan: { editors: { some: { userId: session.user.id } } } },
        { isPublic: true }
      ]
    } else {
      where.OR = [
        { isPublic: true },
        { plan: { published: true } }
      ]
    }

    if (planId) where.planId = planId
    if (groupId) where.groupId = groupId
    if (productId) where.productId = productId
    if (schoolContentId) where.schoolContentId = schoolContentId
    if (eventId) where.eventId = eventId
    if (category) where.category = category
    if (priority) where.priority = priority
    if (status) where.status = status
    if (userId) where.userId = userId
    if (q) {
      where.OR = [
        ...(where.OR as Record<string, unknown>[]),
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ].filter(Boolean)
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const skip = (page - 1) * pageSize

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          plan: { select: { id: true, title: true, imageUrl: true, status: true, published: true } },
          group: { select: { id: true, name: true } },
          product: { select: { id: true, title: true } },
          schoolContent: { select: { id: true, title: true } },
          event: { select: { id: true, title: true } },
          user: {
            select: {
              id: true, name: true, username: true, image: true, shopSlug: true,
              donationAddresses: {
                where: { isPublic: true },
                orderBy: { sortOrder: 'asc' }
              }
            }
          },
          _count: {
            select: { comments: true, fulfillments: true, supports: true, contributions: true }
          }
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.request.count({ where })
    ])

    return NextResponse.json({ items: requests, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('GET /api/requests:', error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const validation = validateBody(requestSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, imageUrl, planId, productId, groupId, schoolContentId, eventId, category, priority, budget, goalAmount, currentFunding, location, isPublic, createGroup, hashtags } = validation.data

    if (planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: planId }
      })
      if (!plan) {
        return apiError("Plan not found", 404)
      }
      const isOwner = plan.userId === session.user.id
      const isEditor = await prisma.planEditor.findFirst({
        where: { planId, userId: session.user.id }
      })
      const userRole = (session.user as { role?: string }).role
      const isAdmin = userRole === 'ADMIN'
      if (!isOwner && !isEditor && !isAdmin) {
        return apiError("You do not have permission to add requests to this plan", 403)
      }
    }

    if (productId && !isPublic) {
      const product = await prisma.product.findFirst({
        where: { id: productId, acceptsRequests: true }
      })
      if (!product) {
        return apiError("Product not found or not available for requests", 404)
      }
    }

    if (groupId) {
      const group = await prisma.group.findFirst({
        where: { id: groupId }
      })
      if (!group) {
        return apiError("Group not found", 404)
      }
    }

    if (schoolContentId) {
      const content = await prisma.schoolContent.findFirst({
        where: { id: schoolContentId }
      })
      if (!content) {
        return apiError("School content not found", 404)
      }
    }

    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: eventId }
      })
      if (!event) {
        return apiError("Event not found", 404)
      }
    }

    const req = await prisma.request.create({
      data: {
        title,
        description,
        imageUrl: imageUrl || null,
        planId: planId || null,
        productId: productId || null,
        groupId: groupId || null,
        schoolContentId: schoolContentId || null,
        eventId: eventId || null,
        userId: session.user.id,
        category: category || 'FUNDING',
        priority: priority || 'MEDIUM',
        budget: budget || null,
        goalAmount: goalAmount || null,
        currentFunding: currentFunding || 0,
        location: location || null,
        isPublic: isPublic || false,
        allowFulfillments: body.allowFulfillments !== undefined ? body.allowFulfillments : true,
        showDonationAddress: body.showDonationAddress !== undefined ? body.showDonationAddress : true,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      }
    })

    if (Array.isArray(hashtags) && hashtags.length > 0) {
      await linkHashtags('REQUEST', req.id, hashtags)
    } else {
      const text = [title, description || ''].join(' ')
      await extractAndLinkHashtags(text, 'REQUEST', req.id)
    }

    if (createGroup) {
      const groupName = `${title} Discussion`
      const group = await prisma.group.create({
        data: {
          name: groupName,
          description: `Community discussion group for the request: ${title}. ${description || ''}`,
          isLocationBased: !!location,
          location: location || null,
          userId: session.user.id,
          members: {
            create: {
              userId: session.user.id,
              role: 'ADMIN'
            }
          }
        }
      })
      await prisma.request.update({
        where: { id: req.id },
        data: { groupId: group.id }
      })
      return NextResponse.json({ ...req, groupId: group.id, _group: group })
    }

    return apiSuccess(req)
  } catch (error) {
    console.error('POST /api/requests:', error)
    return apiError("Internal server error", 500)
  }
}
