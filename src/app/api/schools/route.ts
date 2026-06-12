import { apiSuccess, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const contentType = searchParams.get('type') || ''
  const sort = searchParams.get('sort') || 'recent'
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  const contentWhere: Record<string, unknown> = {
    user: { schoolSlug: { not: null } }
  }

  if (query) {
    contentWhere.OR = [
      { title: { contains: query } },
      { content: { contains: query } }
    ]
  }

  if (category && category !== 'all') {
    contentWhere.category = category
  }

  if (contentType && contentType !== 'all') {
    contentWhere.contentType = contentType
  }

  const contents = await prisma.schoolContent.findMany({ skip, take: limit,
    where: contentWhere,
    include: {
      user: {
        select: {
          id: true,
          schoolName: true,
          schoolSlug: true,
          schoolImage: true,
          name: true
        }
      },
      author: {
        select: { name: true }
      },
      _count: {
        select: { purchases: true }
      }
    },
    orderBy: sort === 'popular' 
      ? { purchases: { _count: 'desc' } }
      : { createdAt: 'desc' },
    take: 50
  })

  const schools = await prisma.user.findMany({ skip, take: limit,
    where: { schoolSlug: { not: null }, schoolName: { not: '' } },
    select: {
      id: true,
      schoolName: true,
      schoolAbout: true,
      schoolImage: true,
      schoolSlug: true,
      name: true,
      schoolContentsOwned: {
        select: { id: true }
      }
    }
  })

  return NextResponse.json({
    contents: contents.map(c => ({
      id: c.id,
      title: c.title,
      contentType: c.contentType,
      price: c.price,
      isPaid: c.isPaid,
      isSubscription: c.isSubscription,
      subscriptionPrice: c.subscriptionPrice,
      createdAt: c.createdAt.toISOString(),
      author: c.author.name,
      school: {
        name: c.user.schoolName,
        slug: c.user.schoolSlug,
        image: c.user.schoolImage
      },
      purchaseCount: c._count.purchases
    })),
    schools: schools.map(s => ({
      id: s.id,
      schoolName: s.schoolName,
      schoolAbout: s.schoolAbout,
      schoolImage: s.schoolImage,
      schoolSlug: s.schoolSlug,
      ownerName: s.name,
      contentCount: s.schoolContentsOwned.length
    }))
  })
}
