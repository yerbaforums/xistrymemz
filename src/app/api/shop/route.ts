import { apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      shopName: true,
      shopAbout: true,
      shopImage: true,
      shopSlug: true,
      shopCategory: true,
      email: true,
      name: true
    }
  })

  return apiSuccess(user)
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const body = await request.json()
  const { shopName, shopAbout, shopImage, shopCoverImage, shopCoverStyle, shopSlug, shopCategory, email } = body

  if (!shopName?.trim()) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { shopSlug: null, shopName: null, shopAbout: null, shopImage: null, shopCoverImage: null, shopCategory: 'OTHER' }
    })
    return NextResponse.json({ error: 'Shop name is required', unpublished: true }, { status: 400 })
  }

  const slug = (shopSlug || shopName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || null

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      shopName,
      shopAbout,
      shopImage,
      shopCoverImage,
      shopCoverStyle,
      shopSlug: slug,
      shopCategory: shopCategory || 'OTHER',
      email
    }
  })

  return NextResponse.json({
    shopName: user.shopName,
    shopAbout: user.shopAbout,
    shopImage: user.shopImage,
    shopCoverImage: user.shopCoverImage,
    shopSlug: user.shopSlug,
    shopCategory: user.shopCategory,
    email: user.email
  })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'unpublish') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { shopSlug: null }
    })
    return NextResponse.json({ success: true, action: 'unpublished' })
  }

  if (action === 'delete') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        shopSlug: null,
        shopName: null,
        shopAbout: null,
        shopImage: null,
        shopCoverImage: null,
        shopCategory: 'OTHER'
      }
    })
    return NextResponse.json({ success: true, action: 'deleted' })
  }

  return apiError("Invalid action", 400)
}
