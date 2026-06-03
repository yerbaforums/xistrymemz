import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getRelatedEntitiesData,
  createBacklink,
  removeBacklink,
  EntityType,
} from '@/services/backlinkService'

const OWNER_FIELDS: Record<string, { field: string; relation: string }> = {
  PLAN: { field: 'userId', relation: 'user' },
  PRODUCT: { field: 'userId', relation: 'user' },
  POST: { field: 'userId', relation: 'user' },
  EVENT: { field: 'organizerId', relation: 'organizer' },
  REQUEST: { field: 'userId', relation: 'user' },
  SERVICE: { field: 'userId', relation: 'user' },
  GROUP: { field: 'createdById', relation: 'createdBy' },
  SCHOOLCONTENT: { field: 'userId', relation: 'user' },
  SHOP: { field: '', relation: '' },
  SCHOOL: { field: '', relation: '' },
}

const ENTITY_MODELS: Record<string, string> = {
  PLAN: 'plan',
  PRODUCT: 'product',
  POST: 'post',
  EVENT: 'event',
  REQUEST: 'request',
  SERVICE: 'serviceOffering',
  GROUP: 'group',
  SCHOOLCONTENT: 'schoolContent',
  SHOP: 'user',
  SCHOOL: 'user',
}

async function getEntityOwner(
  type: string,
  id: string,
): Promise<string | null> {
  if (type === 'SHOP' || type === 'SCHOOL') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    return user?.id || null
  }

  const modelName = ENTITY_MODELS[type]
  if (!modelName) return null

  const entity = await (prisma as any)[modelName].findUnique({
    where: { id },
    select: { [OWNER_FIELDS[type].field]: true },
  })

  return entity?.[OWNER_FIELDS[type].field] || null
}

async function entityExists(type: string, id: string): Promise<boolean> {
  const modelName = ENTITY_MODELS[type]
  if (!modelName) return false
  const entity = await (prisma as any)[modelName].findUnique({
    where: { id },
    select: { id: true },
  })
  return !!entity
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ items: [] })
    }

    const items = await getRelatedEntitiesData(type as EntityType, id)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching related items:', error)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sourceType, sourceId, targetType, targetId, relationType } =
      await request.json()

    if (!sourceType || !sourceId || !targetType || !targetId) {
      return NextResponse.json(
        { error: 'sourceType, sourceId, targetType, and targetId are required' },
        { status: 400 },
      )
    }

    if (sourceType === targetType && sourceId === targetId) {
      return NextResponse.json(
        { error: 'Cannot link an item to itself' },
        { status: 400 },
      )
    }

    const ownerId = await getEntityOwner(sourceType, sourceId)
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Source entity not found' },
        { status: 404 },
      )
    }

    if (ownerId !== session.user.id) {
      const userRole = (session.user as { role?: string }).role
      if (userRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'You do not own this item' },
          { status: 403 },
        )
      }
    }

    const targetExists = await entityExists(targetType, targetId)
    if (!targetExists) {
      return NextResponse.json(
        { error: 'Target entity not found' },
        { status: 404 },
      )
    }

    const link = await createBacklink({
      sourceType: sourceType as EntityType,
      sourceId,
      targetType: targetType as EntityType,
      targetId,
      relationType: (relationType as any) || 'REFERENCES',
    })

    return NextResponse.json({ success: true, link }, { status: 201 })
  } catch (error) {
    console.error('Error creating backlink:', error)
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sourceType, sourceId, targetType, targetId } =
      await request.json()

    if (!sourceType || !sourceId || !targetType || !targetId) {
      return NextResponse.json(
        { error: 'sourceType, sourceId, targetType, and targetId are required' },
        { status: 400 },
      )
    }

    const ownerId = await getEntityOwner(sourceType, sourceId)
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Source entity not found' },
        { status: 404 },
      )
    }

    if (ownerId !== session.user.id) {
      const userRole = (session.user as { role?: string }).role
      if (userRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'You do not own this item' },
          { status: 403 },
        )
      }
    }

    await removeBacklink(
      sourceType as EntityType,
      sourceId,
      targetType as EntityType,
      targetId,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing backlink:', error)
    return NextResponse.json(
      { error: 'Failed to remove link' },
      { status: 500 },
    )
  }
}
