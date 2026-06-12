import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
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
      schoolName: true,
      schoolAbout: true,
      schoolImage: true,
      schoolSlug: true,
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
  const { schoolName, schoolAbout, schoolImage, schoolCoverImage, schoolCoverStyle } = body

  if (!schoolName?.trim()) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { schoolSlug: null, schoolName: null, schoolAbout: null, schoolImage: null, schoolCoverImage: null }
    })
    return NextResponse.json({ error: 'School name is required', unpublished: true }, { status: 400 })
  }

  const slug = schoolName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      schoolName,
      schoolAbout,
      schoolImage,
      schoolCoverImage,
      schoolCoverStyle,
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
