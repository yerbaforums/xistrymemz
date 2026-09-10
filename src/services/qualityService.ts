import { prisma } from '@/lib/prisma'

export interface ProfileEvidence {
  name: boolean
  bio: boolean
  avatar: boolean
  location: boolean
  verificationLevel: string
  ratingAvg: number
  ratingCount: number
}

export interface ListingEvidence {
  description: boolean
  hasImages: boolean
  hasPrice: boolean
  viewCount: number
  ratingAvg: number
  ratingCount: number
}

export async function getEvidence(userId: string): Promise<ProfileEvidence> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, bio: true, image: true, location: true, verificationLevel: true,
    },
  })
  if (!user) {
    return { name: false, bio: false, avatar: false, location: false, verificationLevel: 'NONE', ratingAvg: 0, ratingCount: 0 }
  }

  const ratings = await prisma.rating.aggregate({
    where: { userId },
    _avg: { rating: true },
    _count: true,
  })

  return {
    name: !!user.name,
    bio: !!user.bio,
    avatar: !!user.image,
    location: !!user.location,
    verificationLevel: user.verificationLevel,
    ratingAvg: ratings._avg.rating ?? 0,
    ratingCount: ratings._count,
  }
}

export async function computeProfileQuality(userId: string): Promise<number> {
  const e = await getEvidence(userId)
  let score = 0

  if (e.name) score += 15
  if (e.bio) score += 15
  if (e.avatar) score += 15
  if (e.location) score += 10

  const levelScores: Record<string, number> = { NONE: 0, BASIC: 10, STANDARD: 15, ADVANCED: 20, PREMIUM: 25 }
  score += levelScores[e.verificationLevel] ?? 0

  if (e.ratingCount > 0) {
    score += Math.round((e.ratingAvg / 5) * 10)
    score += Math.min(e.ratingCount * 2, 10)
  }

  return Math.min(score, 100)
}

export async function getEvidenceForProduct(productId: string): Promise<ListingEvidence> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { description: true, imageUrl: true, price: true, viewCount: true },
  })
  if (!product) {
    return { description: false, hasImages: false, hasPrice: false, viewCount: 0, ratingAvg: 0, ratingCount: 0 }
  }

  const ratings = await prisma.rating.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  })

  return {
    description: !!product.description && product.description.length >= 20,
    hasImages: !!product.imageUrl,
    hasPrice: product.price !== null && product.price > 0,
    viewCount: product.viewCount,
    ratingAvg: ratings._avg.rating ?? 0,
    ratingCount: ratings._count,
  }
}

export async function computeListingQuality(productId: string): Promise<number> {
  const e = await getEvidenceForProduct(productId)
  let score = 0

  if (e.description) score += 25
  if (e.hasImages) score += 20
  if (e.hasPrice) score += 15
  if (e.viewCount > 0) score += Math.min(Math.round(e.viewCount / 10), 15)
  if (e.ratingCount > 0) {
    score += Math.round((e.ratingAvg / 5) * 15)
    score += Math.min(e.ratingCount * 2, 10)
  }

  return Math.min(score, 100)
}

export async function computeShopQuality(userId: string): Promise<number> {
  const profileScore = await computeProfileQuality(userId)

  const products = await prisma.product.findMany({
    where: { userId, published: true },
    select: { id: true },
  })

  const productCount = products.length
  let productAvg = 0
  if (productCount > 0) {
    const scores = await Promise.all(products.map(p => computeListingQuality(p.id)))
    productAvg = scores.reduce((a, b) => a + b, 0) / scores.length
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shopCoverImage: true },
  })
  const coverScore = user?.shopCoverImage ? 10 : 0

  const productCountScore = Math.min(productCount * 3, 15)
  const productComponent = Math.round((productAvg / 100) * 60)

  const total = Math.round(profileScore * 0.25 + productComponent * 0.6 + productCountScore + coverScore)
  return Math.min(total, 100)
}
