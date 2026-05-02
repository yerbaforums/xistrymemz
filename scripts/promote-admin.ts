import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'reed.bobby.jr@gmail.com' },
        { email: 'xb4zy@xistrymemz.xyz' },
        { name: 'xb4zy' }
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