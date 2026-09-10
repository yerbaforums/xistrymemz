import { NextRequest, apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return apiError('Event not found', 404)
    }

    const exceptions = await prisma.recurrenceException.findMany({
      where: { parentEventId: id },
      orderBy: { originalDate: 'asc' },
    })

    return apiSuccess(exceptions)
  } catch (error) {
    console.error('GET /api/events/[id]/exceptions:', error)
    return apiError('Failed to fetch exceptions', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return apiError('Event not found', 404)
    }

    if (event.organizerId !== session.user.id) {
      return apiError('Forbidden', 403)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const { date, action = 'SKIP', overrideData } = body
    if (!date) {
      return apiError('Date is required', 400)
    }

    const originalDate = new Date(date)

    const existing = await prisma.recurrenceException.findUnique({
      where: { parentEventId_originalDate: { parentEventId: id, originalDate } },
    })

    if (existing) {
      const updated = await prisma.recurrenceException.update({
        where: { id: existing.id },
        data: { action, overrideData: overrideData ? JSON.stringify(overrideData) : existing.overrideData },
      })
      return apiSuccess(updated)
    }

    const exception = await prisma.recurrenceException.create({
      data: {
        parentEventId: id,
        originalDate,
        action,
        overrideData: overrideData ? JSON.stringify(overrideData) : null,
      },
    })

    return apiSuccess(exception)
  } catch (error) {
    console.error('POST /api/events/[id]/exceptions:', error)
    return apiError('Failed to create exception', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return apiError('Event not found', 404)
    }

    if (event.organizerId !== session.user.id) {
      return apiError('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const exceptionId = searchParams.get('exceptionId')
    if (!exceptionId) {
      return apiError('Exception ID is required', 400)
    }

    const existing = await prisma.recurrenceException.findUnique({ where: { id: exceptionId } })
    if (!existing || existing.parentEventId !== id) {
      return apiError('Exception not found', 404)
    }

    await prisma.recurrenceException.delete({ where: { id: exceptionId } })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('DELETE /api/events/[id]/exceptions:', error)
    return apiError('Failed to delete exception', 500)
  }
}
