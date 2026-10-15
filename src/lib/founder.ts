import { prisma } from '@/lib/prisma'

/**
 * Platform founder, resolved by public handle only — no email addresses in
 * code. Used for new-user auto-connect.
 */
export const FOUNDER_USERNAME = 'xb4zy'

export async function findFounderUser() {
  return prisma.user.findUnique({ where: { username: FOUNDER_USERNAME } })
}
