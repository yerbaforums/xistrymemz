import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError('Unauthorized', 401)

  try {
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } })
    if (!project) return apiError('Project not found', 404)

    await prisma.projectJoiner.upsert({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
      update: { role: 'FOLLOWER' },
      create: { projectId: id, userId: session.user.id, role: 'FOLLOWER' },
    })

    return apiSuccess({ following: true })
  } catch (err) {
    console.error('POST follow error:', err)
    return apiError('Failed to follow project', 500)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError('Unauthorized', 401)

  try {
    await prisma.projectJoiner.deleteMany({
      where: { projectId: id, userId: session.user.id, role: 'FOLLOWER' },
    })
    return apiSuccess({ following: false })
  } catch (err) {
    console.error('DELETE unfollow error:', err)
    return apiError('Failed to unfollow project', 500)
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  try {
    const [count, isFollowing] = await Promise.all([
      prisma.projectJoiner.count({ where: { projectId: id, role: 'FOLLOWER' } }),
      session?.user?.id
        ? prisma.projectJoiner.findUnique({
            where: { projectId_userId: { projectId: id, userId: session.user.id } },
            select: { id: true },
          }).then(Boolean)
        : Promise.resolve(false),
    ])

    return apiSuccess({ count, isFollowing })
  } catch (err) {
    console.error('GET follow error:', err)
    return apiError('Failed to get follow status', 500)
  }
}
