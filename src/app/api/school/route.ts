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
      schoolName: true,
      schoolAbout: true,
      schoolImage: true,
      schoolSlug: true,
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
  const { schoolName, schoolAbout, schoolImage, schoolCoverImage } = body

  const slug = schoolName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      schoolName,
      schoolAbout,
      schoolImage,
      schoolCoverImage,
      schoolSlug: slug
    }
  })

  return NextResponse.json({
    schoolName: user.schoolName,
    schoolAbout: user.schoolAbout,
    schoolImage: user.schoolImage,
    schoolCoverImage: user.schoolCoverImage,
    schoolSlug: user.schoolSlug
  })
}
