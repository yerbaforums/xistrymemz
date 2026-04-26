import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false }
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
  }
}