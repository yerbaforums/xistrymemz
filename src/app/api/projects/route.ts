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

export const POST = withValidation(projectSchema, async (data, req, session) => {
  try {
    const {
      title, description, imageUrl, status, published,
      goals, mileposts, category,
      location, latitude, longitude,
      lookingForCollaborators, needsVolunteers, volunteerRoles, volunteerDescription,
      goalAmount, acceptsDonations, donationAddress, donationCurrency, donationDescription, donationAddresses,
      images, videoUrl, hashtags,
    } = data

    const project = await createProject({
      title,
      description,
      imageUrl,
      images: images || null,
      videoUrl: videoUrl || null,
      status,
      published,
      category: category || null,
      goals,
      mileposts,
      location: location || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      lookingForCollaborators: lookingForCollaborators ?? false,
      needsVolunteers: needsVolunteers ?? false,
      volunteerRoles: volunteerRoles || null,
      volunteerDescription: volunteerDescription || null,
      goalAmount: goalAmount ?? null,
      acceptsDonations: acceptsDonations ?? false,
      donationAddress: donationAddress || null,
      donationCurrency: donationCurrency || 'ETH',
      donationDescription: donationDescription || null,
      donationAddresses: donationAddresses || null,
      userId: session.user.id,
    })

    if (Array.isArray(hashtags) && hashtags.length > 0) {
      await linkHashtags('PROJECT', project.id, hashtags)
    } else {
      const text = [title, description || ''].join(' ')
      await extractAndLinkHashtags(text, 'PROJECT', project.id)
    }

    return apiSuccess(project, 201)
  } catch (err) {
    console.error('Failed to create project:', err)
    const message = err instanceof Error ? err.message : 'Failed to create project'
    return apiError(message, 500)
  }
})
