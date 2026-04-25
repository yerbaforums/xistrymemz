import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateOldEvents() {
  console.log('Starting event migration...')

  try {
    // Migrate PlanEvents to Event
    const planEvents = await prisma.$queryRaw<Array<{
      id: string
      title: string
      description: string | null
      eventCategory: string | null
      eventDate: Date | null
      location: string | null
      locationDetails: string | null
      latitude: number | null
      longitude: number | null
      maxJoiners: number
      pinned: boolean
      isTicketed: boolean
      ticketPrice: number
      currency: string
      planId: string
      createdAt: Date
      updatedAt: Date
      userId: string
    }>>`
      SELECT pe.*, p."userId" FROM "PlanEvent" pe JOIN "Plan" p ON pe."planId" = p.id
    `

    console.log(`Found ${planEvents.length} PlanEvents`)

    for (const pe of planEvents) {
      try {
        await prisma.event.create({
          data: {
            id: pe.id,
            title: pe.title,
            description: pe.description,
            eventCategory: pe.eventCategory,
            eventDate: pe.eventDate,
            location: pe.location,
            locationDetails: pe.locationDetails,
            latitude: pe.latitude,
            longitude: pe.longitude,
            maxJoiners: pe.maxJoiners,
            pinned: pe.pinned,
            isTicketed: pe.isTicketed,
            ticketPrice: pe.ticketPrice,
            currency: pe.currency,
            planId: pe.planId,
            organizerId: pe.userId,
            createdAt: pe.createdAt,
            updatedAt: pe.updatedAt
          }
        })
        console.log(`Migrated PlanEvent: ${pe.id}`)
      } catch (e) {
        console.log(`PlanEvent ${pe.id} may already exist:`, e)
      }
    }

    // Migrate GroupEvents to Event
    const groupEvents = await prisma.$queryRaw<Array<{
      id: string
      title: string
      description: string | null
      eventCategory: string | null
      eventDate: Date | null
      endDate: Date | null
      location: string | null
      locationDetails: string | null
      latitude: number | null
      longitude: number | null
      maxJoiners: number
      isTicketed: boolean
      ticketPrice: number
      currency: string
      groupId: string | null
      schoolId: string | null
      shopId: string | null
      organizerId: string
      createdAt: Date
      updatedAt: Date
    }>>`
      SELECT ge.* FROM "GroupEvent" ge
    `

    console.log(`Found ${groupEvents.length} GroupEvents`)

    for (const ge of groupEvents) {
      try {
        await prisma.event.create({
          data: {
            id: ge.id,
            title: ge.title,
            description: ge.description,
            eventCategory: ge.eventCategory,
            eventDate: ge.eventDate,
            endDate: ge.endDate,
            location: ge.location,
            locationDetails: ge.locationDetails,
            latitude: ge.latitude,
            longitude: ge.longitude,
            maxJoiners: ge.maxJoiners,
            isTicketed: ge.isTicketed,
            ticketPrice: ge.ticketPrice,
            currency: ge.currency,
            groupId: ge.groupId,
            schoolId: ge.schoolId,
            shopId: ge.shopId,
            organizerId: ge.organizerId,
            createdAt: ge.createdAt,
            updatedAt: ge.updatedAt
          }
        })
        console.log(`Migrated GroupEvent: ${ge.id}`)
      } catch (e) {
        console.log(`GroupEvent ${ge.id} may already exist:`, e)
      }
    }

    // Migrate PlanEventJoiners to EventJoiner
    const planJoiners = await prisma.$queryRaw<Array<{
      id: string
      eventId: string
      userId: string
      joinedAt: Date
    }>>`
      SELECT * FROM "PlanEventJoiner"
    `

    console.log(`Found ${planJoiners.length} PlanEventJoiners`)

    for (const pj of planJoiners) {
      try {
        await prisma.eventJoiner.create({
          data: {
            id: pj.id,
            eventId: pj.eventId,
            userId: pj.userId,
            joinedAt: pj.joinedAt
          }
        })
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${planJoiners.length} PlanEventJoiners`)

    // Migrate GroupEventJoiners to EventJoiner
    const groupJoiners = await prisma.$queryRaw<Array<{
      id: string
      eventId: string
      userId: string
      createdAt: Date
    }>>`
      SELECT * FROM "GroupEventJoiner"
    `

    console.log(`Found ${groupJoiners.length} GroupEventJoiners`)

    for (const gj of groupJoiners) {
      try {
        await prisma.eventJoiner.create({
          data: {
            id: gj.id,
            eventId: gj.eventId,
            userId: gj.userId,
            joinedAt: gj.createdAt
          }
        })
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${groupJoiners.length} GroupEventJoiners`)

    console.log('Migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

migrateOldEvents()
  .catch(console.error)
  .finally(() => prisma.$disconnect())