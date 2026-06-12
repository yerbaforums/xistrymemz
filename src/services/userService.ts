import { prisma } from '@/lib/prisma'

export async function findUsers(query: { search?: string; location?: string; page?: number; limit?: number }) {
  const { search, location, page = 1, limit = 20 } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (location) where.location = { contains: location, mode: 'insensitive' }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, username: true, image: true, location: true, userClass: true },
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) }
}

export async function getUserProfile(usernameOrId: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrId }, { id: usernameOrId }],
    },
    select: {
      id: true, name: true, username: true, image: true, bio: true, location: true,
      userClass: true, earthId: true, verificationLevel: true,
      shopSlug: true, schoolSlug: true,
      createdAt: true,
    },
  })
}

export async function updateProfile(userId: string, data: Record<string, unknown>) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name as string | undefined,
      bio: data.bio as string | null | undefined,
      location: data.location as string | null | undefined,
      image: data.image as string | null | undefined,
      userClass: data.userClass as string | undefined,
      searchRadius: data.searchRadius as number | undefined,
    },
  })
}
