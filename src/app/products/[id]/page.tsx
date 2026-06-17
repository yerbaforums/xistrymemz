import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    select: { title: true, description: true, imageUrl: true },
  })
  if (!product) return {}
  const title = `${product.title} — Products — XistrYmemZ`
  const description = product.description?.slice(0, 160) || 'A product on XistrYmemZ'
  return {
    title,
    description,
    openGraph: { title, description, images: product.imageUrl ? [product.imageUrl] : [] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function ProductDetailPage() {
  return <ProductDetailClient />
}
