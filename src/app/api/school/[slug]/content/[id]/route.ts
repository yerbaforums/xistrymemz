import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params
  const content = await prisma.schoolContent.findUnique({
    where: { id },
    include: { 
      author: { select: { id: true, name: true, image: true } },
      user: { select: { id: true, schoolName: true, schoolSlug: true, image: true } },
      hashtags: { include: { hashtag: { select: { id: true, tag: true } } } },
      _count: { select: { likes: true } },
      originalContent: {
        include: {
          author: { select: { name: true } },
          user: { select: { schoolName: true, schoolSlug: true } }
        }
      }
    }
  })
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(content)
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, id } = await params
  const school = await prisma.user.findFirst({ where: { schoolSlug: slug } })
  if (!school || school.id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const existing = await prisma.schoolContent.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.content !== undefined) data.content = body.content
  if (body.contentType !== undefined) data.contentType = body.contentType
  if (body.price !== undefined) data.price = body.price
  if (body.isPaid !== undefined) data.isPaid = body.isPaid
  if (body.pinned !== undefined) data.pinned = body.pinned
  if (body.images !== undefined) data.images = body.images
  if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl
  if (body.section !== undefined) data.contentSection = body.section
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  const updated = await prisma.schoolContent.update({ where: { id }, data })

  if (body.hashtags !== undefined && Array.isArray(body.hashtags)) {
    await linkHashtags('SCHOOLCONTENT', id, body.hashtags)
  } else {
    const title = data.title || existing.title
    const content = data.content || existing.content
    await extractAndLinkHashtags(String(title) + ' ' + String(content), 'SCHOOLCONTENT', id)
  }

  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, id } = await params
  const school = await prisma.user.findFirst({ where: { schoolSlug: slug } })
  if (!school || school.id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.schoolContent.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.schoolContent.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, id } = await params
  const targetSchool = await prisma.user.findFirst({ where: { schoolSlug: slug } })
  if (!targetSchool || targetSchool.id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const originalContent = await prisma.schoolContent.findUnique({ where: { id } })
  if (!originalContent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const reposted = await prisma.schoolContent.create({
    data: {
      title: body.title || originalContent.title,
      content: body.content || originalContent.content,
      contentType: body.contentType || originalContent.contentType,
      userId: targetSchool.id,
      authorId: originalContent.authorId,
      originalContentId: originalContent.id
    },
    include: { author: { select: { name: true } }, originalContent: { include: { author: { select: { name: true } }, user: { select: { schoolName: true, schoolSlug: true } } } } }
  })
  return NextResponse.json(reposted)
}
