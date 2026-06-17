import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import EventDetailClient from './EventDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    select: { title: true, description: true, imageUrl: true },
  })
  if (!event) return {}
  const title = `${event.title} — Events — XistrYmemZ`
  const description = event.description?.slice(0, 160) || 'An event on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description, images: event.imageUrl ? [event.imageUrl] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function PublicEventPage() {
  return <EventDetailClient />
}
