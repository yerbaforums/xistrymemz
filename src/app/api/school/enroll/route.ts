import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { schoolId } = await request.json()
    if (!schoolId) return apiError('schoolId required', 400)

    const existing = await prisma.schoolEnrollment.findUnique({
      where: { schoolId_studentId: { schoolId, studentId: session.user.id } },
    })
    if (existing) return apiError('Already enrolled', 409)

    const enrollment = await prisma.schoolEnrollment.create({
      data: { schoolId, studentId: session.user.id },
    })

    return apiSuccess(enrollment, 201)
  } catch (error) {
    return apiServerError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { schoolId } = await request.json()
    if (!schoolId) return apiError('schoolId required', 400)

    const enrollment = await prisma.schoolEnrollment.findUnique({
      where: { schoolId_studentId: { schoolId, studentId: session.user.id } },
    })
    if (!enrollment) return apiNotFound()

    await prisma.schoolEnrollment.delete({
      where: { schoolId_studentId: { schoolId, studentId: session.user.id } },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    return apiServerError(error)
  }
}
