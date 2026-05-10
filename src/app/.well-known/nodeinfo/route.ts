import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/federation'

export async function GET() {
  return NextResponse.json({
    links: [{
      rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
      href: `${getBaseUrl()}/api/fediverse/nodeinfo/2.1`
    }]
  })
}
