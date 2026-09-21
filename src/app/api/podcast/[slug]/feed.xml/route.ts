import { NextResponse } from 'next/server'

// Legacy feed location — canonical feed lives at /podcast/{slug}/feed.xml.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  return NextResponse.redirect(new URL(`/podcast/${slug}/feed.xml`, _request.url), 308)
}
