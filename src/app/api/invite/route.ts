import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'USER-'
  for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)]
  return code
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { inviteCode: true, inviteCount: true },
  })

  if (user?.inviteCode) {
    return NextResponse.json({ inviteCode: user.inviteCode, inviteCount: user.inviteCount })
  }

  const code = generateInviteCode()
  await prisma.user.update({ where: { id: session.user.id }, data: { inviteCode: code } })
  return NextResponse.json({ inviteCode: code, inviteCount: 0 })
}
