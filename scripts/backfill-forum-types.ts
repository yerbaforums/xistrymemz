import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const ideasCat = await prisma.forumCategory.findUnique({ where: { slug: 'ideas' } })
  if (ideasCat) {
    const updated = await prisma.forumPost.updateMany({
      where: { categoryId: ideasCat.id, postType: 'GENERAL' },
      data: { postType: 'IDEA', status: 'PROPOSED' }
    })
    console.log('Backfilled IDEAS:', updated.count)
  }
  const debatesCat = await prisma.forumCategory.findUnique({ where: { slug: 'debates' } })
  if (debatesCat) {
    const updated = await prisma.forumPost.updateMany({
      where: { categoryId: debatesCat.id, postType: 'GENERAL' },
      data: { postType: 'DEBATE' }
    })
    console.log('Backfilled DEBATES:', updated.count)
  }
}

main().finally(() => prisma.$disconnect())
