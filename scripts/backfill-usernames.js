const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function backfillUsernames() {
  console.log('Starting username backfill...')

  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true }
  })

  console.log(`Found ${users.length} users without usernames`)

  const takenNames = new Set()
  let updated = 0
  let skipped = 0

  for (const user of users) {
    let username = ''

    if (user.name) {
      username = user.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    }

    if (!username) {
      const suffix = user.id.slice(-8)
      username = `user${suffix}`
    }

    // Handle collisions
    let finalUsername = username
    let counter = 1
    while (takenNames.has(finalUsername)) {
      finalUsername = `${username}${counter}`
      counter++
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: finalUsername }
      })
      takenNames.add(finalUsername)
      updated++
      console.log(`  ✓ ${user.name || '(no name)'} -> ${finalUsername}`)
    } catch (e) {
      // Unique constraint violation, try next number
      console.log(`  ✗ Collision for ${user.name || '(no name)'} -> ${finalUsername}, skipping`)
      skipped++
    }
  }

  console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped`)
}

backfillUsernames()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
