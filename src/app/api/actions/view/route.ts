import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { entityType, entityId } = await request.json()

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'Missing entityType or entityId' }, { status: 400 })
    }

    await prisma.contentView.create({
      data: {
        userId: session?.user?.id || null,
        entityType: entityType.toUpperCase(),
        entityId,
      },
    })

    return NextResponse.json({ recorded: true })
  } catch (error) {
    console.error('View record error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
