import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { schoolSlug: slug },
    select: {
      schoolName: true,
      schoolAbout: true,
      schoolImage: true,
      schoolSlug: true,
      schoolCoverImage: true,
      name: true,
      id: true,
      username: true,
      image: true,
      userClass: true,
      location: true,
      website: true,
      createdAt: true,
      role: true,
      userLinks: {
        select: { id: true, type: true, url: true, label: true, icon: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' }
      },
      donationAddresses: {
        where: { showQR: true },
        select: { id: true, currency: true, address: true, label: true, qrCodeUrl: true, showQR: true }
      },
      _count: {
        select: {
          schoolContentsOwned: true,
          schoolContentsAuthored: true
        }
      }
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  const schoolContents = await prisma.schoolContent.findMany({
    where: { OR: [{ userId: user.id }, { authorId: user.id }] },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 20,
    include: {
      user: { select: { id: true, name: true, image: true, schoolName: true, schoolSlug: true } }
    }
  })

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 10,
    include: { user: { select: { id: true, name: true, image: true } } }
  })

  const avgRating = await prisma.rating.aggregate({
    where: { userId: user.id },
    _avg: { rating: true },
    _count: { rating: true }
  })

  return NextResponse.json({
    schoolName: user.schoolName,
    schoolAbout: user.schoolAbout,
    schoolImage: user.schoolImage,
    schoolCoverImage: user.schoolCoverImage,
    schoolSlug: user.schoolSlug,
    user: {
      name: user.name,
      id: user.id,
      username: user.username,
      image: user.image,
      userClass: user.userClass,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
      role: user.role
    },
    links: user.userLinks,
    donationAddresses: user.donationAddresses,
    contentCount: user._count.schoolContentsOwned + user._count.schoolContentsAuthored,
    avgRating: avgRating._avg.rating || 0,
    ratingCount: avgRating._count.rating,
    schoolContents,
    posts
  })
}
