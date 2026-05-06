import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string; productId: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const group = await prisma.group.findUnique({ where: { id: params.id } })
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const isAdmin = await prisma.groupMember.findFirst({
      where: { groupId: params.id, userId: session.user.id, role: 'ADMIN' }
    })
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can unlink products' }, { status: 403 })
    }

    const groupProduct = await prisma.groupProduct.findUnique({
      where: { groupId_productId: { groupId: params.id, productId: params.productId } }
    })
    if (!groupProduct) {
      return NextResponse.json({ error: 'Product not linked to this group' }, { status: 404 })
    }

    await prisma.groupProduct.delete({
      where: { groupId_productId: { groupId: params.id, productId: params.productId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/groups/[id]/marketplace/[productId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
