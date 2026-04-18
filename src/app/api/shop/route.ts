import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      shopName: true,
      shopAbout: true,
      shopImage: true,
      shopSlug: true,
      email: true,
      name: true
    }
  })

  return NextResponse.json(user)
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { shopName, shopAbout, shopImage } = body

  const slug = shopName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      shopName,
      shopAbout,
      shopImage,
      shopSlug: slug
    }
  })

  return NextResponse.json({
    shopName: user.shopName,
    shopAbout: user.shopAbout,
    shopImage: user.shopImage,
    shopSlug: user.shopSlug
  })
}
