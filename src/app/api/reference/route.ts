import { NextResponse } from 'next/server'
import { getRelatedEntitiesData } from '@/services/backlinkService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ items: [] })
    }

    const items = await getRelatedEntitiesData(type as any, id)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching related items:', error)
    return NextResponse.json({ items: [] })
  }
}
