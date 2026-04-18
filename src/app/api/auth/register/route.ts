import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, name, inviteCode } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  if (inviteCode) {
    const code = await prisma.inviteCode.findUnique({
      where: { code: inviteCode.toUpperCase() }
    })

    if (!code) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      )
    }

    if (!code.isActive) {
      return NextResponse.json(
        { error: 'This invite code is no longer active' },
        { status: 400 }
      )
    }

    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 400 }
      )
    }

    if (code.usedCount >= code.maxUses) {
      return NextResponse.json(
        { error: 'This invite code has reached its usage limit' },
        { status: 400 }
      )
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'User already exists' },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name
    }
  })

  if (inviteCode) {
    await prisma.inviteCode.update({
      where: { code: inviteCode.toUpperCase() },
      data: { usedCount: { increment: 1 } }
    })
  }

  // Auto-connect to founder (xb4zy)
  const founder = await prisma.user.findFirst({
    where: { 
      email: 'xb4zy@xistrymemz.xyz'
    }
  })

  if (founder && founder.id !== user.id) {
    // New user follows founder
    await prisma.connection.create({
      data: {
        requesterId: user.id,
        receiverId: founder.id,
        status: 'ACCEPTED'
      }
    })
    // Founder follows new user
    await prisma.connection.create({
      data: {
        requesterId: founder.id,
        receiverId: user.id,
        status: 'ACCEPTED'
      }
    })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name
  })
}
