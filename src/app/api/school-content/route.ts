import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSchoolCategory } from '@/lib/school-categories'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const body = await request.json()
  const { title, content, contentType, category } = body

  if (!title || !content) {
    return apiError("Title and content required", 400)
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.schoolSlug) {
    return apiError("No school setup", 400)
  }

  const schoolContent = await prisma.schoolContent.create({
    data: {
      title,
      content,
      contentType: contentType || 'article',
      category: normalizeSchoolCategory(category) ?? null,
      userId: session.user.id,
      authorId: session.user.id
    }
  })

  return apiSuccess(schoolContent)
}
