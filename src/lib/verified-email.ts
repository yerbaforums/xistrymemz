import { prisma } from '@/lib/prisma'

export async function hasVerifiedEmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifiedEmail: true }
  })
  return user?.verifiedEmail === true
}