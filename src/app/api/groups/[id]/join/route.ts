import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized - Please log in", 401)
  }

  const userId = session.user.id as string
  const { id: groupId } = await params

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { isPrivate: true }
  })

  if (!group) {
    return apiError("Group not found", 404)
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } }
  })

  if (existing) {
    return apiError("Already a member", 400)
  }

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  })

  if (!user) {
    // Create user on-the-fly (just-in-time provisioning)
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@temp.local`,
        name: userId.split('_')[0] || 'User',
        password: 'EXTERNAL_AUTH'
      }
    })
  }

  const member = await prisma.groupMember.create({
    data: {
      groupId,
      userId: user.id,
      role: 'MEMBER'
    },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } }
    }
  })

  return apiSuccess(member)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: groupId } = await params

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id as string } }
  })

  if (!member) {
    return apiError("Not a member", 400)
  }

  await prisma.groupMember.delete({
    where: { id: member.id }
  })

  return apiSuccess({ success: true })
}
