import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH: admin approve/reject/update a community-submitted category.
// DELETE: admin deletes any category; the creator can delete their own
// still-pending submission.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { id } = await params
    const body = await req.json()

    const category = await prisma.forumCategory.findUnique({
      where: { id },
      select: { id: true, createdById: true, status: true },
    })
    if (!category) return apiNotFound('Category not found')

    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = category.createdById === session.user.id

    // Only admins can approve/reject; owners may edit their own pending submission.
    if (!isAdmin && !(isOwner && category.status === 'PENDING')) {
      return apiError("You do not have permission to update this category", 403)
    }

    const data: Record<string, unknown> = {}
    if (body.status && body.status !== category.status) {
      if (!isAdmin) return apiError("Only admins can change status", 403)
      data.status = body.status
    }
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (typeof body.icon === 'string' && body.icon.trim()) data.icon = body.icon.trim()

    const updated = await prisma.forumCategory.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true, slug: true, icon: true } },
        createdBy: { select: { id: true, name: true, username: true } },
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating forum category:', error)
    return apiError("Failed to update category", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { id } = await params
    const category = await prisma.forumCategory.findUnique({
      where: { id },
      select: { id: true, createdById: true, status: true, _count: { select: { posts: true } } },
    })
    if (!category) return apiNotFound('Category not found')

    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = category.createdById === session.user.id

    if (!isAdmin && !(isOwner && category.status === 'PENDING')) {
      return apiError("You do not have permission to delete this category", 403)
    }

    // Only allow deletion when the category is empty (protect existing posts).
    if (category._count.posts > 0) {
      return apiError("Cannot delete a category that has posts", 400)
    }

    await prisma.forumCategory.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting forum category:', error)
    return apiError("Failed to delete category", 500)
  }
}