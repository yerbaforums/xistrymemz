import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError, withValidation } from '@/lib/api-helpers'
import { projectSchema } from '@/lib/schemas'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'
import { getPublicProjects, getProjectsByUser, createProject } from '@/services/projectService'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(request.url)
  const isPublic = searchParams.get('public') === 'true'

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || (isPublic ? '4' : '20'))))
  const skip = (page - 1) * pageSize

  if (isPublic) {
    const { items, total } = await getPublicProjects(skip, pageSize)
    return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  }

  if (!session?.user?.id) {
    return apiError('Unauthorized', 401)
  }

  const { items, total } = await getProjectsByUser(session.user.id, false, skip, pageSize)
  return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export const POST = withValidation(projectSchema, async (req, session, data) => {
  try {
    const { title, description, imageUrl, status, published, goals, mileposts, lookingForCollaborators, acceptsDonations, donationAddress, donationCurrency, donationDescription, donationAddresses, hashtags } = data

    const project = await createProject({
      title,
      description,
      imageUrl,
      status,
      published,
      goals,
      mileposts,
      userId: session.user.id,
    })

    await prisma.project.update({
      where: { id: plan.id },
      data: {
        lookingForCollaborators: lookingForCollaborators ?? false,
        acceptsDonations: acceptsDonations ?? false,
        donationAddress: donationAddress || null,
        donationCurrency: donationCurrency || 'ETH',
        donationDescription: donationDescription || null,
        donationAddresses: donationAddresses || null,
      },
    })

    if (Array.isArray(hashtags) && hashtags.length > 0) {
      await linkHashtags('PROJECT', plan.id, hashtags)
    } else {
      const text = [title, description || ''].join(' ')
      await extractAndLinkHashtags(text, 'PROJECT', plan.id)
    }

    return apiSuccess(plan, 201)
  } catch (err) {
    console.error('Failed to create project:', err)
    const message = err instanceof Error ? err.message : 'Failed to create project'
    return apiError(message, 500)
  }
})
