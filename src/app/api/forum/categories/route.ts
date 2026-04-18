import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { posts: true } }
      }
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching forum categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, slug, icon, sortOrder } = body

    const existing = await prisma.forumCategory.findUnique({
      where: { slug }
    })
    if (existing) {
      return NextResponse.json({ error: 'Category slug already exists' }, { status: 400 })
    }

    const category = await prisma.forumCategory.create({
      data: {
        name,
        description,
        slug,
        icon,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating forum category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}