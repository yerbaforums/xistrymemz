import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id && !session?.user?.email) {
      const sessionId = (session?.user as any)?.id
      const sessionEmail = session?.user?.email
      const sessionRole = (session?.user as any)?.role

      if (sessionId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: sessionId },
            select: { id: true, role: true, email: true }
          })
          if (dbUser) {
            return NextResponse.json({
              id: dbUser.id,
              role: dbUser.role,
              email: dbUser.email,
              source: 'db-from-id'
            })
          }
        } catch (dbError) {
          console.error('[/api/auth/role] DB query by id failed:', dbError)
        }
      }

      if (sessionEmail) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: sessionEmail },
            select: { id: true, role: true, email: true }
          })
          if (dbUser) {
            return NextResponse.json({
              id: dbUser.id,
              role: dbUser.role,
              email: dbUser.email,
              source: 'db-from-email'
            })
          }
        } catch (dbError) {
          console.error('[/api/auth/role] DB query by email failed:', dbError)
        }
      }

      return NextResponse.json({ role: 'USER', source: 'no-session' })
    }

    const userId = (session.user as any).id as string
    const sessionRole = (session.user as any).role as string

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true }
      })

      if (dbUser) {
        return NextResponse.json({
          id: dbUser.id,
          role: dbUser.role,
          email: dbUser.email,
          source: 'db-verified'
        })
      }
    } catch (dbError) {
      console.error('[/api/auth/role] DB query failed, falling back to session:', dbError)
    }

    return NextResponse.json({
      id: userId,
      role: sessionRole || 'USER',
      source: 'session-fallback'
    })
  } catch (error) {
    console.error('[/api/auth/role] Unexpected error:', error)
    return NextResponse.json({ role: 'USER', source: 'error' }, { status: 200 })
  }
}