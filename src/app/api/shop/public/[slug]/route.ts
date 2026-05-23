import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { shopSlug: slug },
    select: {
      shopName: true,
      shopAbout: true,
      shopImage: true,
      shopSlug: true,
      name: true,
      id: true,
      username: true,
      image: true,
      userClass: true,
      location: true,
      website: true,
      createdAt: true,
      role: true,
      shopCoverImage: true,
      shopCoverStyle: true,
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
          products: true,
          ratingsReceived: true
        }
      }
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  const products = await prisma.product.findMany({
    where: { userId: user.id, published: true, type: 'PRODUCT' },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  const rentals = await prisma.product.findMany({
    where: { userId: user.id, published: true, type: 'RENTAL' },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  const services = await prisma.serviceOffering.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 20
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

  const serviceCount = await prisma.serviceOffering.count({
    where: { userId: user.id, isActive: true }
  })

  const rentalCount = await prisma.product.count({
    where: { userId: user.id, published: true, type: 'RENTAL' }
  })

  return NextResponse.json({
    shopName: user.shopName,
    shopAbout: user.shopAbout,
    shopImage: user.shopImage,
    shopCoverImage: user.shopCoverImage,
    shopCoverStyle: user.shopCoverStyle,
    shopSlug: user.shopSlug,
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
    productCount: user._count.products,
    serviceCount,
    rentalCount,
    ratingCount: user._count.ratingsReceived,
    avgRating: avgRating._avg.rating || 0,
    products,
    services,
    rentals,
    posts
  })
}
