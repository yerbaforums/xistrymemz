import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { schoolSlug: slug },
    select: { id: true }
  })

  if (!user) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  const contents = await prisma.schoolContent.findMany({
    where: { userId: user.id },
    include: { 
      author: { select: { name: true } },
      user: { select: { schoolName: true, schoolSlug: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(contents)
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { schoolSlug: slug }
  })

  if (!user || user.id !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { title, content, contentType, hashtags: explicitHashtags } = body

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content required' }, { status: 400 })
  }

  const schoolContent = await prisma.schoolContent.create({
    data: {
      title,
      content,
      contentType: contentType || 'article',
      userId: user.id,
      authorId: session.user.id
    }
  })

  if (Array.isArray(explicitHashtags) && explicitHashtags.length > 0) {
    await linkHashtags('SCHOOLCONTENT', schoolContent.id, explicitHashtags)
  } else {
    await extractAndLinkHashtags(title + ' ' + content, 'SCHOOLCONTENT', schoolContent.id)
  }

  return NextResponse.json(schoolContent)
}
