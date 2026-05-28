import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['POST','PRODUCT','SERVICE','EVENT','PLAN','REQUEST','SCHOOLCONTENT','GROUP','SHOP']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entityType, entityId, amount, currency } = await request.json()
    if (!entityType || !entityId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const type = entityType.toUpperCase()
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const tip = await prisma.entityTip.create({
      data: {
        userId: session.user.id,
        entityType: type,
        entityId,
        amount: parseFloat(amount),
        currency: currency || 'XTM',
      },
    })

    return NextResponse.json({ tip })
  } catch (error) {
    console.error('Tip error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
