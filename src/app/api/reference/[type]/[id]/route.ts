import { apiSuccess, apiError, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params

    let item: Record<string, unknown> | null = null

    switch (type) {
      case 'PRODUCT': {
        const p = await prisma.product.findUnique({ where: { id } })
        if (p) item = { id: p.id, title: p.title, image: p.imageUrl }
        break
      }
      case 'EVENT': {
        const e = await prisma.event.findUnique({ where: { id } })
        if (e) item = { id: e.id, title: e.title, image: null }
        break
      }
      case 'REQUEST': {
        const r = await prisma.request.findUnique({ where: { id } })
        if (r) item = { id: r.id, title: r.title, image: null }
        break
      }
      case 'PROJECT': {
        const p = await prisma.project.findUnique({ where: { id } })
        if (p) item = { id: p.id, title: p.title, image: null }
        break
      }
      case 'POST': {
        const post = await prisma.post.findUnique({
          where: { id },
          include: { user: { select: { id: true, name: true, image: true, username: true } } }
        })
        if (post) {
          item = {
            id: post.id,
            title: post.content,
            content: post.content,
            image: post.imageUrl || null,
            images: post.images,
            user: post.user,
            createdAt: post.createdAt.toISOString(),
          }
        }
        break
      }
      case 'SCHOOLCONTENT': {
        const sc = await prisma.schoolContent.findUnique({ where: { id }, include: { author: { select: { image: true } } } })
        if (sc) item = { id: sc.id, title: sc.title, image: sc.author.image }
        break
      }
      case 'FORUMPOST': {
        const fp = await prisma.forumPost.findUnique({ where: { id }, include: { author: { select: { image: true } } } })
        if (fp) item = { id: fp.id, title: fp.title, image: fp.author.image }
        break
      }
      case 'GROUP': {
        const g = await prisma.group.findUnique({ where: { id } })
        if (g) item = { id: g.id, title: g.name, image: g.imageUrl }
        break
      }
      case 'SERVICE': {
        const s = await prisma.serviceOffering.findUnique({ where: { id } })
        if (s) item = { id: s.id, title: s.title, image: s.imageUrl }
        break
      }
      case 'SHOP': {
        const shopUser = await prisma.user.findFirst({ where: { shopSlug: id } })
        if (shopUser) item = { id: id, title: shopUser.shopName || 'Shop', image: shopUser.shopImage }
        break
      }
      case 'SCHOOL': {
        const schoolUser = await prisma.user.findFirst({ where: { schoolSlug: id } })
        if (schoolUser) item = { id: id, title: schoolUser.schoolName || 'School', image: schoolUser.schoolImage }
        break
      }
    }

    if (!item) {
      return NextResponse.json({ error: `${type} not found` }, { status: 404 })
    }

    return apiSuccess({ item })
  } catch (error) {
    console.error('Error fetching reference:', error)
    return apiError("Failed to fetch reference", 500)
  }
}
