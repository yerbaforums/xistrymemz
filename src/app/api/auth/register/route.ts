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
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
