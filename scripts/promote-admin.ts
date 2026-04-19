import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { email: { equals: 'reed.bobby.jr@gmail.com', mode: 'insensitive' } },
        { email: { equals: 'xb4zy@xistrymemz.xyz', mode: 'insensitive' } },
        { name: { equals: 'xb4zy', mode: 'insensitive' } }
      ]
    },
    data: { role: 'ADMIN' }
  })

  console.log(`Promoted ${result.count} user(s) to ADMIN`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})