import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string; productId: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const group = await prisma.group.findUnique({ where: { id: params.id } })
    if (!group) {
      return apiError("Group not found", 404)
    }

    const isAdmin = await prisma.groupMember.findFirst({
      where: { groupId: params.id, userId: session.user.id, role: 'ADMIN' }
    })
    if (!isAdmin) {
      return apiError("Only admins can unlink products", 403)
    }

    const groupProduct = await prisma.groupProduct.findUnique({
      where: { groupId_productId: { groupId: params.id, productId: params.productId } }
    })
    if (!groupProduct) {
      return apiError("Product not linked to this group", 404)
    }

    await prisma.groupProduct.delete({
      where: { groupId_productId: { groupId: params.id, productId: params.productId } }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/groups/[id]/marketplace/[productId]:', error)
    return apiError("Internal server error", 500)
  }
}
