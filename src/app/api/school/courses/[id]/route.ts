import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()
    const { id } = await params

    const existing = await prisma.schoolCourse.findUnique({ where: { id } })
    if (!existing) return apiNotFound()
    if (existing.schoolId !== session.user.id) return apiUnauthorized()

    const body = await request.json()
    const course = await prisma.schoolCourse.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        difficulty: body.difficulty,
        isPublic: body.isPublic,
        sortOrder: body.sortOrder,
      },
    })

    return apiSuccess(course)
  } catch (error) {
    return apiServerError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()
    const { id } = await params

    const existing = await prisma.schoolCourse.findUnique({ where: { id } })
    if (!existing) return apiNotFound()
    if (existing.schoolId !== session.user.id) return apiUnauthorized()

    await prisma.schoolCourse.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (error) {
    return apiServerError(error)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()
    const { id } = await params

    const existing = await prisma.schoolCourse.findUnique({ where: { id } })
    if (!existing) return apiNotFound()
    if (existing.schoolId !== session.user.id) return apiUnauthorized()

    // Add content to course
    const body = await request.json()
    const item = await prisma.schoolCourseContent.create({
      data: {
        courseId: id,
        contentId: body.contentId,
        sortOrder: body.sortOrder || 0,
        optional: body.optional || false,
      },
    })

    return apiSuccess(item, 201)
  } catch (error) {
    return apiServerError(error)
  }
}
