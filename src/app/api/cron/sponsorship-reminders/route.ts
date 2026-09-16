import { apiSuccess } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

function authorized(request: Request): boolean {
  const required = process.env.CRON_SECRET
  if (!required) return true
  const url = new URL(request.url)
  return url.searchParams.get('secret') === required
}

// GET /api/cron/sponsorship-reminders — daily: notify sponsors whose month is due
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const due = await prisma.sponsorship.findMany({
    where: { status: 'ACTIVE', nextReminderAt: { lte: new Date() } },
    take: 200,
  })

  let reminded = 0
  for (const s of due) {
    let title = 'a request'
    let linkEntity: { type: string; id: string } | null = null
    try {
      if (s.entityType === 'REQUEST') {
        const r = await prisma.request.findUnique({ where: { id: s.entityId }, select: { title: true } })
        if (r) title = `"${r.title}"`
      } else if (s.entityType === 'SCHOOL') {
        const u = await prisma.user.findUnique({ where: { id: s.entityId }, select: { schoolName: true, name: true } })
        if (u) title = `"${u.schoolName || u.name}"`
      } else {
        const p = await prisma.project.findUnique({ where: { id: s.entityId }, select: { title: true } })
        const row = p as { title?: string } | null
        if (row?.title) title = `"${row.title}"`
      }
    } catch { /* keep fallback */ }

    try {
      await createNotification({
        type: 'SPONSORSHIP_REMINDER',
        userId: s.sponsorId,
        message: `Your monthly sponsorship (${s.amount} ${s.currency}) for ${title} is due. Complete it with the owner's donation address, or skip this month.`,
        link: `/dashboard/sponsorships`,
      } as never)
      reminded++
    } catch { /* preference off or failure — still advance below to avoid spam */ }

    await prisma.sponsorship.update({
      where: { id: s.id },
      data: { nextReminderAt: new Date(Date.now() + MONTH_MS) },
    })
  }

  return apiSuccess({ reminded, checked: due.length })
}
