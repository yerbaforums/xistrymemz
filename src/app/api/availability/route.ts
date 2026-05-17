import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const slots = await prisma.availability.findMany({
      where: { userId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    })

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dayOfWeek, startTime, endTime, isActive } = body

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slot = await prisma.availability.upsert({
      where: {
        userId_dayOfWeek_startTime_endTime: {
          userId: session.user.id,
          dayOfWeek,
          startTime,
          endTime
        }
      },
      update: { isActive: isActive !== false },
      create: {
        userId: session.user.id,
        dayOfWeek,
        startTime,
        endTime,
        isActive: isActive !== false
      }
    })

    return NextResponse.json({ slot }, { status: 201 })
  } catch (error) {
    console.error('Error saving availability:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
}
