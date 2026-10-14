import { NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Lightweight username availability check for the register form.
 * Read-only and unauthenticated — usernames are public on the platform —
 * and covered by the middleware's read budget, so checking while typing
 * never burns an auth slot.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = (searchParams.get('username') || '').trim().toLowerCase()
  const username = raw.replace(/[^a-z0-9]/g, '')

  if (!username || username.length < 3 || username.length > 50) {
    return NextResponse.json({ available: false, valid: false })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  return NextResponse.json({ available: !existing, valid: true })
}
