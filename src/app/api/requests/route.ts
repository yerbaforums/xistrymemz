import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requestSchema, validateBody } from '@/lib/schemas'

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
    
    const where: Record<string, unknown> = {}
    
    if (publicOnly) {
      where.isPublic = true
    } else if (session?.user?.id) {
      where.OR = [
        { userId: session.user.id },
        { plan: { userId: session.user.id } },
        { group: { members: { some: { userId: session.user.id } } } }
      ]
    } else {
      where.isPublic = true
    }

    if (planId) where.planId = planId
    if (groupId) where.groupId = groupId
    if (productId) where.productId = productId
    if (schoolContentId) where.schoolContentId = schoolContentId
    if (eventId) where.eventId = eventId
    if (category) where.category = category
    if (priority) where.priority = priority
    if (status) where.status = status

    const requests = await prisma.request.findMany({
      where,
      include: {
        plan: true,
        group: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        schoolContent: { select: { id: true, title: true } },
        event: { select: { id: true, title: true } },
        user: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('GET /api/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateBody(requestSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, planId, productId, groupId, schoolContentId, eventId, category, priority, budget, goalAmount, currentFunding, location, isPublic } = validation.data

    if (planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: planId }
      })
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
      const isOwner = plan.userId === session.user.id
      const isEditor = await prisma.planEditor.findFirst({
        where: { planId, userId: session.user.id }
      })
      const userRole = (session.user as { role?: string }).role
      const isAdmin = userRole === 'ADMIN'
      if (!isOwner && !isEditor && !isAdmin) {
        return NextResponse.json({ error: 'You do not have permission to add requests to this plan' }, { status: 403 })
      }
    }

    if (productId && !isPublic) {
      const product = await prisma.product.findFirst({
        where: { id: productId, acceptsRequests: true }
      })
      if (!product) {
        return NextResponse.json({ error: 'Product not found or not available for requests' }, { status: 404 })
      }
    }

    if (groupId) {
      const group = await prisma.group.findFirst({
        where: { id: groupId }
      })
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
    }

    if (schoolContentId) {
      const content = await prisma.schoolContent.findFirst({
        where: { id: schoolContentId }
      })
      if (!content) {
        return NextResponse.json({ error: 'School content not found' }, { status: 404 })
      }
    }

    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: eventId }
      })
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
    }

    const req = await prisma.request.create({
      data: {
        title,
        description,
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
        status: 'PENDING'
      }
    })

    return NextResponse.json(req)
  } catch (error) {
    console.error('POST /api/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
