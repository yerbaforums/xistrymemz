import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { email, password, name, username, inviteCode } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (username) {
      const normalized = username.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!normalized || normalized.length < 2) {
        return NextResponse.json(
          { error: 'Username must be at least 2 characters (letters and numbers only).' },
          { status: 400 }
        )
      }

      const existingUsername = await prisma.user.findUnique({
        where: { username: normalized }
      })

      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username already taken. Please choose a different username.' },
          { status: 400 }
        )
      }
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
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const normalizedUsername = username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : null

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username: normalizedUsername
      }
    })

    if (inviteCode) {
      await prisma.inviteCode.update({
        where: { code: inviteCode.toUpperCase() },
        data: { usedCount: { increment: 1 } }
      })
    }

    const founder = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'xb4zy@xistrymemz.xyz' },
          { name: 'xb4zy' }
        ]
      }
    })

    if (founder && founder.id !== user.id) {
      await prisma.connection.create({
        data: {
          requesterId: user.id,
          receiverId: founder.id,
          status: 'ACCEPTED'
        }
      })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
