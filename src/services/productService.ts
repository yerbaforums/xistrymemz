import { prisma } from '@/lib/prisma'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export interface ProductQuery {
  category?: string
  type?: string
  location?: string
  shopSlug?: string
  userId?: string
  localOnly?: boolean
  userLat?: number
  userLng?: number
  radius?: number
  pinned?: boolean
  search?: string
  page?: number
  limit?: number
  sort?: string
}

export async function findProducts(query: ProductQuery) {
  const { category, type, location, shopSlug, userId, search, page = 1, limit = 20, sort } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { published: true }

  if (category) where.category = category
  if (type) where.type = type
  if (shopSlug) where.shopSlug = shopSlug
  if (userId) where.userId = userId
  if (search) where.title = { contains: search, mode: 'insensitive' }
  if (location) where.location = { contains: location, mode: 'insensitive' }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, image: true, shopSlug: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: sort === 'price_asc' ? { price: 'asc' } : sort === 'price_desc' ? { price: 'desc' } : { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) }
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, image: true, shopSlug: true, location: true } },
      _count: { select: { reviews: true } },
      hashtags: { include: { hashtag: true } },
    },
  })
}

export async function createProduct(data: Record<string, unknown>, userId: string) {
  const hashtags = extractHashtags((data.description as string) || '')
  const product = await prisma.product.create({
    data: {
      title: data.title as string,
      description: data.description as string || '',
      price: data.price as number | null,
      type: data.type as string || 'PRODUCT',
      category: data.category as string || 'OTHER',
      condition: data.condition as string || 'NEW',
      location: data.location as string || null,
      imageUrl: data.imageUrl as string || null,
      images: data.images as string[] || [],
      userId,
      shopSlug: data.shopSlug as string || null,
    },
  })

  if (hashtags.length > 0) {
    await linkHashtags('PRODUCT', product.id, hashtags)
  }

  return product
}

export async function updateProduct(id: string, data: Record<string, unknown>, userId: string) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new Error('Not found')
  if (existing.userId !== userId) throw new Error('Forbidden')

  const hashtags = extractHashtags((data.description as string) || '')
  const product = await prisma.product.update({
    where: { id },
    data: {
      title: data.title as string | undefined,
      description: data.description as string | undefined,
      price: data.price as number | null | undefined,
      category: data.category as string | undefined,
      condition: data.condition as string | undefined,
      location: data.location as string | null | undefined,
      imageUrl: data.imageUrl as string | null | undefined,
      images: data.images as string[] | undefined,
      shopSlug: data.shopSlug as string | null | undefined,
    },
  })

  if (hashtags.length > 0) {
    await linkHashtags('PRODUCT', product.id, hashtags)
  }

  return product
}

export async function deleteProduct(id: string, userId: string) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new Error('Not found')
  if (existing.userId !== userId) throw new Error('Forbidden')

  await prisma.productHashtag.deleteMany({ where: { productId: id } })
  await prisma.product.delete({ where: { id } })
  return { deleted: true }
}
