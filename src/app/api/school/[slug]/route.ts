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
      name: true,
      id: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({
    schoolName: user.schoolName,
    schoolAbout: user.schoolAbout,
    schoolImage: user.schoolImage,
    user: { name: user.name, id: user.id }
  })
}
