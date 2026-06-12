import { NextRequest, apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return apiError("Code required", 400)
    }

    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!inviteCode) {
      return NextResponse.json({ valid: false, error: 'Invalid invite code' }, { status: 404 })
    }

    if (!inviteCode.isActive) {
      return NextResponse.json({ valid: false, error: 'This invite code is no longer active' }, { status: 400 })
    }

    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This invite code has expired' }, { status: 400 })
    }

    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return NextResponse.json({ valid: false, error: 'This invite code has reached its usage limit' }, { status: 400 })
    }

    return NextResponse.json({ 
      valid: true, 
      type: inviteCode.type,
      usesRemaining: inviteCode.maxUses - inviteCode.usedCount
    })
  } catch (error) {
    console.error('Error validating invite code:', error)
    return apiError("Failed to validate code", 500)
  }
}
