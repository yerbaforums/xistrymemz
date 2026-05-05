const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkXb4zy() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'xb4zy', mode: 'insensitive' } },
        { username: 'xb4zy' },
        { email: 'xb4zy@xistrymemz.xyz' }
      ]
    }
  })
  console.log('Found user:', JSON.stringify(user, null, 2))
  if (user) {
    if (!user.username) {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: 'xb4zy' }
      })
      console.log('Set username to xb4zy')
    }
  }
  await prisma.$disconnect()
}

checkXb4zy().catch(console.error)
