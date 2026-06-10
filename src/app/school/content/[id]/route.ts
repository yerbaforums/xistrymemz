import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const content = await prisma.schoolContent.findUnique({
    where: { id },
    select: {
      userId: true
    }
  })

  if (!content) {
    return NextResponse.redirect(new URL('/schools', _request.url))
  }

  const user = await prisma.user.findUnique({
    where: { id: content.userId },
    select: { schoolSlug: true }
  })

  if (!user?.schoolSlug) {
    return NextResponse.redirect(new URL('/schools', _request.url))
  }

  return NextResponse.redirect(
    new URL(`/school/${user.schoolSlug}/content/${id}`, _request.url)
  )
}
