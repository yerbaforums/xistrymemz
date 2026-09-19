import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import BlogDetailClient from './BlogDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const user = await prisma.user.findFirst({
    where: { blogSlug: slug, showBlog: true },
    select: { blogName: true, blogTagline: true, blogImage: true, name: true },
  })
  if (!user) return {}
  const title = `${user.blogName || user.name || slug} — Blog — XistrYmemZ`
  const description = user.blogTagline?.slice(0, 160) || `Long-form writing from ${user.blogName || user.name || slug}`
  return {
    title,
    description,
    openGraph: { title, description, images: user.blogImage ? [user.blogImage] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <BlogDetailClient params={params} />
}