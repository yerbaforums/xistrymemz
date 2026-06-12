import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) return apiError('schoolId required', 400)

    const school = await prisma.user.findUnique({ where: { id: schoolId }, select: { id: true } })
    if (!school) return apiError('School not found', 404)

    const enrollments = await prisma.schoolEnrollment.findMany({
      where: { schoolId },
      include: {
        student: { select: { id: true, name: true, username: true, image: true } },
        progress: true,
      },
      orderBy: { enrolledAt: 'desc' },
    })

    const students = enrollments.map(e => {
      const completedLessons = e.progress.filter(p => p.completed).length
      return {
        id: e.student.id,
        name: e.student.name,
        username: e.student.username,
        image: e.student.image,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        completedLessons,
        totalProgress: e.progress.length,
      }
    })

    return apiSuccess({ students, total: students.length })
  } catch (error) {
    return apiServerError(error)
  }
}
