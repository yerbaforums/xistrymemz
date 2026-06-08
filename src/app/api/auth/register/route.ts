import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { registerSchema, validateInput } from '@/lib/validation'
import { generateActorKeys, getBaseUrl } from '@/lib/federation'
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email'

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

    const validation = validateInput(registerSchema, { name, email, password, username, inviteCode })
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (username) {
      const normalized = username.toLowerCase().replace(/[^a-z0-9]/g, '')
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

    let invitedByUser: string | null = null

    if (inviteCode) {
      const referrer = await prisma.user.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } })
      if (referrer) {
        invitedByUser = referrer.id
      } else {
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
    const { publicKey, privateKey } = generateActorKeys()

    const userInviteCode = 'USER-' + randomBytes(3).toString('hex').toUpperCase()

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username: normalizedUsername,
        publicKey,
        privateKey,
        inviteCode: userInviteCode,
        ...(invitedByUser ? { invitedBy: invitedByUser } : {}),
      }
    })

    if (invitedByUser) {
      await prisma.user.update({
        where: { id: invitedByUser },
        data: { inviteCount: { increment: 1 } },
      })
    }

    const fedUrl = `${getBaseUrl()}/api/fediverse/actor/${normalizedUsername || user.id}`
    await prisma.user.update({
      where: { id: user.id },
      data: { federatedUrl: fedUrl }
    })

    if (inviteCode && !invitedByUser) {
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

    // Generate verification token and send emails
    const verifyToken = randomBytes(32).toString('hex')
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    prisma.verificationToken.create({
      data: { token: verifyToken, userId: user.id, expiresAt: verifyExpires }
    }).then(() => sendVerificationEmail(user.email, verifyToken)).catch(() => {})

    sendWelcomeEmail(user.email, user.name || 'there').catch(() => {})

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
