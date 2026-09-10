import { handleApi } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const { id } = await params

    const badges = await prisma.badge.findMany({
      where: { userId: id },
      include: {
        awardedByUser: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { badges }
  })
}
