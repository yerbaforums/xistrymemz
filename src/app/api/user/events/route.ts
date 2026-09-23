import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  sourceEventId: z.string().optional().nullable(),
})

// Personal calendar entries (UserEvent). Trips stay separate;
// planning links to events via TripStop.linkedEvents instead of merging.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.userEvent.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: 'asc' },
    take: 200,
  })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  const start = new Date(parsed.data.startDate)
  if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
  let end: Date | null = null
  if (parsed.data.endDate) {
    end = new Date(parsed.data.endDate)
    if (Number.isNaN(end.getTime())) return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
  }
  // Idempotency for "Save event to planner": same source event → one personal entry.
  if (parsed.data.sourceEventId) {
    const existing = await prisma.userEvent.findFirst({
      where: { userId: session.user.id, description: { contains: `[evtid:${parsed.data.sourceEventId}]` } },
    })
    if (existing) return NextResponse.json({ item: existing, deduped: true })
  }
  const description = parsed.data.sourceEventId
    ? `${parsed.data.description || ''}\n[evtid:${parsed.data.sourceEventId}]`.trim()
    : (parsed.data.description || null)
  const created = await prisma.userEvent.create({
    data: {
      title: parsed.data.title,
      description,
      startDate: start,
      endDate: end,
      location: parsed.data.location || null,
      userId: session.user.id,
      visibility: 'PRIVATE',
    },
  })
  return NextResponse.json({ item: created })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const sourceEventId = searchParams.get('sourceEventId')
  if (id) {
    const owned = await prisma.userEvent.findFirst({ where: { id, userId: session.user.id } })
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.userEvent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
  if (sourceEventId) {
    const owned = await prisma.userEvent.findFirst({
      where: { userId: session.user.id, description: { contains: `[evtid:${sourceEventId}]` } },
    })
    if (owned) await prisma.userEvent.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Missing id' }, { status: 400 })
}
