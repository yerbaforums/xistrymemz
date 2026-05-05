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
      name: true,
      id: true,
      username: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  return NextResponse.json({
    shopName: user.shopName,
    shopAbout: user.shopAbout,
    shopImage: user.shopImage,
    user: { name: user.name, id: user.id, username: user.username }
  })
}
