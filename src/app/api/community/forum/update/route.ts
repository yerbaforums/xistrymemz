import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const devCategory = await prisma.forumCategory.findUnique({
      where: { slug: 'development' }
    })

    if (!devCategory) {
      return NextResponse.json({ error: 'Development category not found' }, { status: 404 })
    }

    const existingUpdate = await prisma.forumPost.findFirst({
      where: { 
        categoryId: devCategory.id,
        title: '_site_updates'
      }
    })

    let post
    if (existingUpdate) {
      const updatedContent = existingUpdate.content + '\n\n---\n\n' + content
      post = await prisma.forumPost.update({
        where: { id: existingUpdate.id },
        data: { content: updatedContent }
      })
    } else {
      post = await prisma.forumPost.create({
        data: {
          title: '_site_updates',
          content: content,
          authorId: session.user.id,
          categoryId: devCategory.id,
          pinned: true
        }
      })
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Error posting site update:', error)
    return NextResponse.json({ error: 'Failed to post update' }, { status: 500 })
  }
}