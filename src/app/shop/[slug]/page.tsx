import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import ShopDetailClient from './ShopDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const user = await prisma.user.findUnique({
    where: { shopSlug: slug },
    select: { name: true, bio: true, image: true },
  })
  if (!user) return {}
  const title = `${user.name || slug} — Shop — XistrYmemZ`
  const description = user.bio?.slice(0, 160) || `Shop of ${user.name || slug} on XistrYmemZ`
  return {
    title,
    description,
    openGraph: { title, description, images: user.image ? [user.image] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function ShopDetailPage() {
  return <ShopDetailClient />
}
