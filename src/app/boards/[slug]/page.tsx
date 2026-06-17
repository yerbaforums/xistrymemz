import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import BoardDetailClient from './BoardDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const board = await prisma.board.findUnique({
    where: { slug },
    select: { title: true, description: true },
  })
  if (!board) return {}
  const title = `${board.title} — Boards — XistrYmemZ`
  const description = board.description?.slice(0, 160) || 'A board on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function BoardDetailPage() {
  return <BoardDetailClient />
}
