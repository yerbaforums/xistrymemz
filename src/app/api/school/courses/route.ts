import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) return apiError('schoolId required', 400)

    const courses = await prisma.schoolCourse.findMany({
      where: { schoolId, isPublic: true },
      include: {
        contents: {
          include: { content: { select: { id: true, title: true, contentType: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { contents: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return apiSuccess({ courses })
  } catch (error) {
    return apiServerError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const body = await request.json()
    const course = await prisma.schoolCourse.create({
      data: {
        schoolId: body.schoolId,
        title: body.title,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        difficulty: body.difficulty || 'beginner',
        isPublic: body.isPublic ?? true,
        sortOrder: body.sortOrder || 0,
      },
    })

    return apiSuccess(course, 201)
  } catch (error) {
    return apiServerError(error)
  }
}
