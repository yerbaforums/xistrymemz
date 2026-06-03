import { NextResponse } from 'next/server'
import { discover } from '@/lib/discover'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || undefined
    const type = searchParams.get('type') || undefined
    const intent = searchParams.get('intent') || undefined
    const hashtag = searchParams.get('hashtag') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let lat: number | undefined
    let lng: number | undefined
    let radius: number | undefined

    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    const radiusParam = searchParams.get('radius')

    if (latParam && lngParam) {
      lat = parseFloat(latParam)
      lng = parseFloat(lngParam)
      radius = parseInt(radiusParam || '250')
    } else {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { latitude: true, longitude: true, searchRadius: true },
        })
        if (user?.latitude && user?.longitude) {
          lat = user.latitude
          lng = user.longitude
          radius = user.searchRadius || 250
        }
      }
    }

    const result = await discover({ q, type, lat, lng, radius, intent, hashtag, page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/discover:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
