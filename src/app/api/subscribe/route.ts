import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, source } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const existing = await prisma.emailSubscriber.findUnique({
      where: { email }
    })

    if (existing) {
      if (!existing.subscribed) {
        await prisma.emailSubscriber.update({
          where: { email },
          data: { subscribed: true }
        })
        return NextResponse.json({ 
          message: 'Welcome back! You\'ve been resubscribed.',
          subscribed: true 
        })
      }
      return NextResponse.json({ 
        message: 'You\'re already subscribed!',
        subscribed: true 
      })
    }

    await prisma.emailSubscriber.create({
      data: {
        email,
        name: name || null,
        source: source || 'landing_page',
        subscribed: true
      }
    })

    return NextResponse.json({ 
      message: 'Thanks for subscribing!',
      subscribed: true 
    })
  } catch (error) {
    console.error('Email subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    await prisma.emailSubscriber.update({
      where: { email },
      data: { subscribed: false }
    })

    return NextResponse.json({ 
      message: 'You\'ve been unsubscribed.',
      subscribed: false 
    })
  } catch (error) {
    console.error('Email unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe. Please try again.' },
      { status: 500 }
    )
  }
}
