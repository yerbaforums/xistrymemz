import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import BlogPostClient from './BlogPostClient'

export const dynamic = 'force-dynamic'

interface Params {
  slug: string
  postSlug: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, postSlug } = await params
  const user = await prisma.user.findFirst({
    where: { blogSlug: slug, showBlog: true },
    select: { id: true, blogName: true, name: true },
  })
  if (!user) return {}
  const post = await prisma.blogPost.findFirst({
    where: { blogId: user.id, slug: postSlug, status: 'PUBLISHED' },
    select: { title: true, excerpt: true, coverImage: true },
  })
  if (!post) return {}
  const title = `${post.title} — ${user.blogName || user.name || slug}`
  const description = post.excerpt?.slice(0, 160) || stripHtml(post.excerpt || '').slice(0, 160) || 'A post on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description, images: post.coverImage ? [post.coverImage] : [], type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function BlogPostPage({ params }: { params: Promise<Params> }) {
  return <BlogPostClient params={params} />
}