import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ codes })
  } catch (error) {
    console.error('Error fetching invite codes:', error)
    return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, maxUses, expiresAt, count } = body

    const codes = []
    const numCodes = count || 1

    for (let i = 0; i < numCodes; i++) {
      const code = await prisma.inviteCode.create({
        data: {
          code: generateCode(),
          type: type || 'BETA',
          maxUses: maxUses || 1,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true
        }
      })
      codes.push(code)
    }

    return NextResponse.json({ success: true, codes })
  } catch (error) {
    console.error('Error creating invite codes:', error)
    return NextResponse.json({ error: 'Failed to create codes' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, isActive } = body

    const code = await prisma.inviteCode.update({
      where: { id },
      data: { isActive }
    })

    return NextResponse.json({ success: true, code })
  } catch (error) {
    console.error('Error updating invite code:', error)
    return NextResponse.json({ error: 'Failed to update code' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Code ID required' }, { status: 400 })
    }

    await prisma.inviteCode.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invite code:', error)
    return NextResponse.json({ error: 'Failed to delete code' }, { status: 500 })
  }
}
