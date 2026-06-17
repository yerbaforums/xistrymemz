import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import GroupDetailClient from './GroupDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const group = await prisma.group.findUnique({
    where: { id },
    select: { name: true, description: true, imageUrl: true },
  })
  if (!group) return {}
  const title = `${group.name} — Groups — XistrYmemZ`
  const description = group.description?.slice(0, 160) || 'A group on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description, images: group.imageUrl ? [group.imageUrl] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function GroupDetailPage() {
  return <GroupDetailClient />
}
