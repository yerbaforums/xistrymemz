import { prisma } from '@/lib/prisma'

export async function getWallet(userId: string) {
  return prisma.wallet.findFirst({ where: { userId } })
}

export async function getTransactions(userId: string, query: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = query
  const skip = (page - 1) * limit

  const where = { userId }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return { transactions, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) }
}

export async function generateAddress(currency: string, userId: string) {
  const existing = await prisma.wallet.findFirst({ where: { userId, cryptoType: currency } })
  if (existing) return existing

  return prisma.wallet.create({
    data: {
      userId,
      cryptoType: currency,
      address: `${currency.toLowerCase()}_${userId.slice(0, 8)}`,
      isPrimary: true,
    },
  })
}

export async function getBalance(userId: string) {
  const wallets = await prisma.wallet.findMany({ where: { userId } })
  return wallets.map(w => ({ currency: w.cryptoType, address: w.address, isPrimary: w.isPrimary }))
}
