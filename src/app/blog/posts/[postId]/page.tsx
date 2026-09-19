import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Permalink for blog posts referenced from search results.
// Resolves the post to its canonical /blog/[slug]/[postSlug] URL.
export default async function BlogPostPermalink({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      slug: true,
      status: true,
      blog: { select: { blogSlug: true, showBlog: true } },
    },
  })
  if (!post || post.status !== 'PUBLISHED' || !post.blog.blogSlug || !post.blog.showBlog) {
    redirect('/blogs')
  }
  redirect(`/blog/${post.blog.blogSlug}/${post.slug}`)
}