import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import ForumThreadClient from './ForumThreadClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await params
  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: { title: true, content: true },
  })
  if (!post) return {}
  const title = `${post.title} — Forum — XistrYmemZ`
  const description = post.content?.slice(0, 160) || 'A forum post on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function ForumThreadPage() {
  return <ForumThreadClient />
}
