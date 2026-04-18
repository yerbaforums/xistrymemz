import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params

  const content = await prisma.schoolContent.findUnique({
    where: { id },
    include: { 
      author: { select: { name: true } },
      user: { select: { schoolName: true, schoolSlug: true } },
      originalContent: {
        include: {
          author: { select: { name: true } },
          user: { select: { schoolName: true, schoolSlug: true } }
        }
      }
    }
  })

  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  return NextResponse.json(content)
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  const targetSchool = await prisma.user.findFirst({
    where: { schoolSlug: slug }
  })

  if (!targetSchool || targetSchool.id !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const originalContent = await prisma.schoolContent.findUnique({
    where: { id: (await params).id }
  })

  if (!originalContent) {
    return NextResponse.json({ error: 'Original content not found' }, { status: 404 })
  }

  const body = await request.json()
  const { title, content, contentType } = body

  const repostedContent = await prisma.schoolContent.create({
    data: {
      title: title || originalContent.title,
      content: content || originalContent.content,
      contentType: contentType || originalContent.contentType,
      userId: targetSchool.id,
      authorId: originalContent.authorId,
      originalContentId: originalContent.id
    },
    include: {
      author: { select: { name: true } },
      originalContent: {
        include: {
          author: { select: { name: true } },
          user: { select: { schoolName: true, schoolSlug: true } }
        }
      }
    }
  })

  return NextResponse.json(repostedContent)
}
