import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      return apiError("Project not found", 404)
    }

    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'
    const isOwner = project.userId === session.user.id
    const isEditor = await prisma.projectEditor.findFirst({
      where: { projectId: id, userId: session.user.id }
    })

    if (!isOwner && !isEditor && !isAdmin) {
      return apiError("Forbidden", 403)
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('GET /api/projects/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    let parsedBody: any
    try {
      parsedBody = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const body = parsedBody

    const existingProject = await prisma.project.findUnique({
      where: { id }
    })

    if (!existingProject) {
      return apiError("Project not found", 404)
    }

    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'
    const isOwner = existingProject.userId === session.user.id
    const isEditor = await prisma.projectEditor.findFirst({
      where: { projectId: id, userId: session.user.id }
    })

    if (!isOwner && !isEditor && !isAdmin) {
      return apiError("Forbidden", 403)
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        title: (body as any).title ?? existingProject.title,
        description: body.description ?? existingProject.description,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existingProject.imageUrl,
        status: body.status ?? existingProject.status,
        goals: body.goals !== undefined ? body.goals : existingProject.goals,
        mileposts: body.mileposts !== undefined ? body.mileposts : existingProject.mileposts,
        milepostStatus: body.milepostStatus !== undefined ? body.milepostStatus : existingProject.milepostStatus,
        published: body.published ?? existingProject.published,
        resources: body.resources !== undefined ? body.resources : existingProject.resources,
        schoolId: body.schoolId ?? existingProject.schoolId,
        shopId: body.shopId ?? existingProject.shopId,
        lookingForCollaborators: body.lookingForCollaborators ?? existingProject.lookingForCollaborators,
        acceptsDonations: body.acceptsDonations !== undefined ? body.acceptsDonations : existingProject.acceptsDonations,
        donationAddress: body.donationAddress !== undefined ? (body.donationAddress || null) : existingProject.donationAddress,
        donationCurrency: body.donationCurrency ?? existingProject.donationCurrency,
        donationDescription: body.donationDescription !== undefined ? (body.donationDescription || null) : existingProject.donationDescription,
        donationAddresses: body.donationAddresses !== undefined ? (body.donationAddresses || null) : existingProject.donationAddresses,
        category: body.category !== undefined ? body.category : existingProject.category,
        location: body.location !== undefined ? body.location : existingProject.location,
        locationDetails: body.locationDetails !== undefined ? body.locationDetails : existingProject.locationDetails,
        images: body.images !== undefined ? body.images : existingProject.images,
        goalAmount: body.goalAmount !== undefined ? body.goalAmount : existingProject.goalAmount,
        needsVolunteers: body.needsVolunteers !== undefined ? body.needsVolunteers : existingProject.needsVolunteers,
        volunteerRoles: body.volunteerRoles !== undefined ? body.volunteerRoles : existingProject.volunteerRoles,
        volunteerDescription: body.volunteerDescription !== undefined ? body.volunteerDescription : existingProject.volunteerDescription,
        videoUrl: body.videoUrl !== undefined ? body.videoUrl : existingProject.videoUrl,
        pinned: body.pinned !== undefined ? body.pinned : existingProject.pinned,
        latitude: body.latitude !== undefined ? body.latitude : existingProject.latitude,
        longitude: body.longitude !== undefined ? body.longitude : existingProject.longitude,
        phases: body.phases !== undefined ? body.phases : existingProject.phases
      },
      include: {
        hashtags: {
          include: { hashtag: { select: { id: true, tag: true } } }
        }
      }
    })

    if (body.hashtags !== undefined && Array.isArray(body.hashtags)) {
      await linkHashtags('PROJECT', id, body.hashtags)
    } else if (body.title !== undefined || body.description !== undefined) {
      const title = body.title ?? existingProject.title
      const description = body.description ?? existingProject.description
      await extractAndLinkHashtags(title + ' ' + (description || ''), 'PROJECT', id)
    }

    return apiSuccess(project)
  } catch (error) {
    console.error('PUT /api/projects/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      return apiError("Project not found", 404)
    }

    await prisma.project.delete({
      where: { id }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/projects/[id]:', error)
    return apiError("Internal server error", 500)
  }
}
