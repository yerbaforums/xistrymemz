import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { schoolId, contentId, completed } = await request.json()
    if (!schoolId || !contentId) return apiError('schoolId and contentId required', 400)

    const enrollment = await prisma.schoolEnrollment.findUnique({
      where: { schoolId_studentId: { schoolId, studentId: session.user.id } },
    })
    if (!enrollment) return apiError('Not enrolled', 403)

    const progress = await prisma.contentProgress.upsert({
      where: {
        enrollmentId_contentId: { enrollmentId: enrollment.id, contentId },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        enrollmentId: enrollment.id,
        contentId,
        completed,
        completedAt: completed ? new Date() : null,
      },
    })

    return apiSuccess(progress)
  } catch (error) {
    return apiServerError(error)
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) return apiError('schoolId required', 400)

    const enrollment = await prisma.schoolEnrollment.findUnique({
      where: { schoolId_studentId: { schoolId, studentId: session.user.id } },
      include: {
        progress: true,
      },
    })

    if (!enrollment) return apiSuccess({ enrolled: false, progress: [] })

    const courseContents = await prisma.schoolCourseContent.findMany({
      where: { course: { schoolId } },
      select: { contentId: true },
    })

    const totalLessons = courseContents.length
    const completedLessons = enrollment.progress.filter(p => p.completed).length
    const completionPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    return apiSuccess({
      enrolled: true,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      progress: enrollment.progress,
      totalLessons,
      completedLessons,
      completionPct,
    })
  } catch (error) {
    return apiServerError(error)
  }
}
