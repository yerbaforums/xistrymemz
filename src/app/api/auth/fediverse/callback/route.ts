import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const identityId = searchParams.get('identityId')
    if (!identityId) return NextResponse.redirect(new URL('/auth/login', request.url))

    const identity = await prisma.federatedIdentity.findUnique({
      where: { id: identityId },
      include: { user: { select: { id: true, username: true, name: true } } },
    })
    if (!identity?.userId) return NextResponse.redirect(new URL('/auth/login?error=identity_not_found', request.url))

    // Create a token using NextAuth's JWT
    const { encode } = await import('next-auth/jwt')
    const token = await encode({
      token: {
        id: identity.userId,
        name: identity.user?.name,
        email: identity.user?.username,
        picture: null,
        sub: identity.userId,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    // Redirect to dashboard with the session token
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch {
    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
  }
}
