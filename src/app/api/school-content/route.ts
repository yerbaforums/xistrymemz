import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, content, contentType } = body

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.schoolSlug) {
    return NextResponse.json({ error: 'No school setup' }, { status: 400 })
  }

  const schoolContent = await prisma.schoolContent.create({
    data: {
      title,
      content,
      contentType: contentType || 'article',
      userId: session.user.id,
      authorId: session.user.id
    }
  })

  return NextResponse.json(schoolContent)
}
