import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params

    let item: { id: string; title: string; image: string | null } | null = null

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
      case 'PLAN': {
        const p = await prisma.plan.findUnique({ where: { id } })
        if (p) item = { id: p.id, title: p.title, image: null }
        break
      }
    }

    if (!item) {
      return NextResponse.json({ error: `${type} not found` }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error fetching reference:', error)
    return NextResponse.json({ error: 'Failed to fetch reference' }, { status: 500 })
  }
}
