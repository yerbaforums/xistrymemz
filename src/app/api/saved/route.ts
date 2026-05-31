import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['PLAN', 'PRODUCT', 'REQUEST', 'EVENT', 'FORUM_POST', 'POST', 'SERVICE', 'SCHOOLCONTENT', 'GROUP']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const saved = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      itemType: true,
      itemId: true,
      createdAt: true,
    }
  })

  const groups: Record<string, string[]> = {}
  for (const item of saved) {
    if (!groups[item.itemType]) groups[item.itemType] = []
    groups[item.itemType].push(item.itemId)
  }

  const titles: Record<string, Record<string, string | null>> = {}
  for (const [type, ids] of Object.entries(groups)) {
    titles[type] = {}
    switch (type) {
      case 'PLAN': {
        const items = await prisma.plan.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.PLAN[i.id] = i.title })
        break
      }
      case 'PRODUCT': {
        const items = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.PRODUCT[i.id] = i.title })
        break
      }
      case 'REQUEST': {
        const items = await prisma.request.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.REQUEST[i.id] = i.title })
        break
      }
      case 'EVENT': {
        const items = await prisma.event.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.EVENT[i.id] = i.title })
        break
      }
      case 'POST': {
        const items = await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true, content: true } })
        items.forEach(i => { titles.POST[i.id] = i.content?.slice(0, 100) || null })
        break
      }
      case 'FORUM_POST': {
        const items = await prisma.forumPost.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.FORUM_POST[i.id] = i.title })
        break
      }
      case 'SERVICE': {
        const items = await prisma.serviceOffering.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.SERVICE[i.id] = i.title })
        break
      }
      case 'SCHOOLCONTENT': {
        const items = await prisma.schoolContent.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        items.forEach(i => { titles.SCHOOLCONTENT[i.id] = i.title })
        break
      }
      case 'GROUP': {
        const items = await prisma.group.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
        items.forEach(i => { titles.GROUP[i.id] = i.name })
        break
      }
    }
  }

  const enriched = saved.map(item => ({
    ...item,
    title: titles[item.itemType]?.[item.itemId] || null,
  }))

  return NextResponse.json({ saved: enriched })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { itemType, itemId } = body

    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 })
    }

    if (!VALID_TYPES.includes(itemType)) {
      return NextResponse.json({ error: `Invalid itemType. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const existing = await prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId: session.user.id,
          itemType,
          itemId,
        }
      }
    })

    if (existing) {
      return NextResponse.json({ saved: existing })
    }

    const saved = await prisma.savedItem.create({
      data: {
        userId: session.user.id,
        itemType,
        itemId,
      }
    })

    return NextResponse.json({ saved }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { itemType, itemId } = body

    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 })
    }

    const existing = await prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId: session.user.id,
          itemType,
          itemId,
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.savedItem.delete({
      where: {
        userId_itemType_itemId: {
          userId: session.user.id,
          itemType,
          itemId,
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
