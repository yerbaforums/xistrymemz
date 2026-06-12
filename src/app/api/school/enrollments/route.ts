import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Get courses owned by user (if they're an instructor)
    const ownedCourses = await prisma.schoolCourse.findMany({
      where: { schoolId: userId },
      select: { id: true },
    })
    const courseIds = ownedCourses.map(c => c.id)

    // Get enrollments for owned courses
    let studentCount = 0
    if (courseIds.length > 0) {
      const courseContents = await prisma.schoolCourseContent.findMany({
        where: { courseId: { in: courseIds } },
        select: { contentId: true },
      })
      const contentIds = courseContents.map(cc => cc.contentId)

      const progressCounts = await prisma.contentProgress.groupBy({
        by: ['enrollmentId'],
        where: { contentId: { in: contentIds } },
        _count: { id: true },
      })

      studentCount = progressCounts.length
    }

    // Get enrollments for the user as a student
    const enrollments = await prisma.schoolEnrollment.findMany({
      where: { studentId: session.user.id },
      include: {
        school: { select: { schoolName: true, schoolSlug: true } },
        progress: true,
      },
    })

    let progress = null
    if (enrollments.length > 0) {
      const totalLessons = enrollments.reduce((sum, e) => sum + e.progress.length, 0)
      const completedLessons = enrollments.reduce((sum, e) => sum + e.progress.filter(p => p.completed).length, 0)
      progress = {
        totalLessons,
        completedLessons,
        completionPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      }
    }

    return apiSuccess({
      studentCount,
      enrollments: enrollments.map(e => ({
        id: e.id,
        schoolName: e.school.schoolName,
        schoolSlug: e.school.schoolSlug,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
      })),
      progress,
    })
  } catch (error) {
    return apiServerError(error)
  }
}
