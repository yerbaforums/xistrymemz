import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import ProfileDetailClient from './ProfileDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, bio: true, image: true },
  })
  if (!user) return {}
  const title = `${user.name || username} — Profile — XistrYmemZ`
  const description = user.bio?.slice(0, 160) || `Profile of ${user.name || username} on XistrYmemZ`
  return {
    title,
    description,
    openGraph: { title, description, images: user.image ? [user.image] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function ProfilePage() {
  return <ProfileDetailClient />
}
