import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      shopName: true,
      shopSlug: true,
      shopAbout: true,
      shopImage: true,
      name: true
    }
  })

  if (!user?.shopSlug) {
    return NextResponse.json({ hasShop: false })
  }

  return NextResponse.json({
    hasShop: true,
    shopName: user.shopName,
    shopSlug: user.shopSlug,
    shopAbout: user.shopAbout,
    shopImage: user.shopImage,
    userName: user.name
  })
}
