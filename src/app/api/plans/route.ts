import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planSchema, validateBody } from '@/lib/schemas'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(request.url)
  const isPublic = searchParams.get('public') === 'true'

  if (isPublic) {
    const plans = await prisma.plan.findMany({
      where: {
        published: true,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        status: true,
        user: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 4
    })
    return NextResponse.json(plans)
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plans = await prisma.plan.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      status: true,
      published: true,
      _count: {
        select: { requests: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(plans)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateBody(planSchema, body)
  
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const { title, description, imageUrl, goals, mileposts, lookingForCollaborators, acceptsDonations, donationAddress, donationCurrency, donationDescription, donationAddresses } = validation.data

  const plan = await prisma.plan.create({
    data: {
      title,
      description,
      imageUrl: imageUrl || null,
      goals: goals || null,
      mileposts: mileposts || null,
      milepostStatus: '[]',
      userId: session.user.id,
      status: 'ACTIVE',
      published: true,
      lookingForCollaborators: lookingForCollaborators ?? false,
      acceptsDonations: acceptsDonations ?? false,
      donationAddress: donationAddress || null,
      donationCurrency: donationCurrency || 'ETH',
      donationDescription: donationDescription || null,
      donationAddresses: donationAddresses || null
    }
  })

  return NextResponse.json(plan)
}
