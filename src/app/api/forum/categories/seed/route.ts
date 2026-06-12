import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_CATEGORIES = [
  { name: 'Site Discussion', slug: 'site-discussion', description: 'Discuss the platform, features, and feedback', icon: '💬', sortOrder: 1 },
  { name: 'Health & Wellness', slug: 'health-wellness', description: 'Health tips, wellness discussions, and self-care', icon: '❤️', sortOrder: 2 },
  { name: 'Gardening & Farming', slug: 'gardening-farming', description: 'Growing tips, farming techniques, and plant care', icon: '🌱', sortOrder: 3 },
  { name: 'Community Polls', slug: 'community-polls', description: 'Vote on community decisions and gather opinions', icon: '📊', sortOrder: 4 },
  { name: 'General Chat', slug: 'general-chat', description: 'Casual conversations and off-topic discussions', icon: '🗣️', sortOrder: 5 },
  { name: 'Help & Support', slug: 'help-support', description: 'Get help from the community', icon: '❓', sortOrder: 6 }
]

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return apiError("Unauthorized", 401)
    }

    const created = []
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await prisma.forumCategory.findUnique({
        where: { slug: cat.slug }
      })
      if (!existing) {
        const createdCat = await prisma.forumCategory.create({
          data: cat
        })
        created.push(createdCat)
      }
    }

    return NextResponse.json({ 
      message: `Created ${created.length} categories`,
      categories: created 
    })
  } catch (error) {
    console.error('Error seeding forum categories:', error)
    return apiError("Failed to seed categories", 500)
  }
}