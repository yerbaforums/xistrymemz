import { apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Reddit-style structure: main categories can have subcategories (children),
// and every category can be browsed directly. Posts go into the exact
// category (main or sub) the author picked.
interface SeedCategory {
  name: string
  slug: string
  description: string
  icon: string
  sortOrder: number
  parentSlug?: string
}

const DEFAULT_CATEGORIES: SeedCategory[] = [
  // --- General (reddit-style) ---
  { name: 'Introductions', slug: 'introductions', description: 'Say hello and tell the community about yourself', icon: '👋', sortOrder: 1 },
  { name: 'General Chat', slug: 'general-chat', description: 'Casual conversations and off-topic discussions', icon: '🗣️', sortOrder: 2 },
  { name: 'Off-Topic', slug: 'off-topic', description: 'Anything that does not fit elsewhere', icon: '🎲', sortOrder: 3 },
  { name: 'Ask the Community', slug: 'ask-community', description: 'Ask anything — get answers from the whole community (like r/AskReddit)', icon: '🤔', sortOrder: 4 },
  { name: 'Community Polls', slug: 'community-polls', description: 'Vote on community decisions and gather opinions', icon: '📊', sortOrder: 5 },
  { name: 'News & Current Events', slug: 'news-current-events', description: 'Local and global news, community events, and what is happening now', icon: '📰', sortOrder: 6 },
  { name: 'Hobbies & Interests', slug: 'hobbies-interests', description: 'Gaming, movies, music, food, pets, DIY, travel and more', icon: '🎨', sortOrder: 7 },
  { name: 'Memes & Fun', slug: 'memes-fun', description: 'Lighthearted posts, jokes, and community fun', icon: '😂', sortOrder: 8 },

  // --- Platform ---
  { name: 'Site Discussion', slug: 'site-discussion', description: 'Discuss the platform, features, and feedback', icon: '💬', sortOrder: 10 },
  { name: 'Ideas & Suggestions', slug: 'ideas-suggestions', description: 'Propose new features, improvements, and community ideas', icon: '💡', sortOrder: 11 },
  { name: 'Debates', slug: 'debates', description: 'Structured PRO / CON / NEUTRAL arguments on any topic', icon: '⚖️', sortOrder: 12 },
  { name: 'Updates & Announcements', slug: 'updates-announcements', description: 'Official news, changelogs, and community announcements', icon: '📢', sortOrder: 13 },
  { name: 'Help & Support', slug: 'help-support', description: 'Get help from the community', icon: '❓', sortOrder: 14 },

  // --- Commerce & Services ---
  { name: 'Marketplace & Trade', slug: 'marketplace-trade', description: 'Discuss products, shops, services, and trading', icon: '🛒', sortOrder: 20 },
  { name: 'Products', slug: 'products', description: 'Show off and discuss products from the marketplace', icon: '📦', sortOrder: 21, parentSlug: 'marketplace-trade' },
  { name: 'Services', slug: 'services', description: 'Find and review service providers', icon: '🔧', sortOrder: 22, parentSlug: 'marketplace-trade' },
  { name: 'Shops & Sellers', slug: 'shops-sellers', description: 'Talk about shops, sellers, and buying experiences', icon: '🏪', sortOrder: 23, parentSlug: 'marketplace-trade' },
  { name: 'Barters & Trades', slug: 'barters-trades', description: 'Swap items and services without money', icon: '🔄', sortOrder: 24, parentSlug: 'marketplace-trade' },
  { name: 'Requests & Barters', slug: 'requests-barters', description: 'Offer help, request items, and arrange barters', icon: '🙋', sortOrder: 25 },

  // --- Making dreams real ---
  { name: 'Projects & Collabs', slug: 'projects-collabs', description: 'Share projects, find collaborators, and volunteer', icon: '🚀', sortOrder: 30 },
  { name: 'Project Showcase', slug: 'project-showcase', description: 'Show off your completed or in-progress projects', icon: '🏆', sortOrder: 31, parentSlug: 'projects-collabs' },
  { name: 'Find Collaborators', slug: 'find-collaborators', description: 'Looking for teammates, mentors, or contributors? Post here', icon: '🤝', sortOrder: 32, parentSlug: 'projects-collabs' },
  { name: 'Volunteer & Help Out', slug: 'volunteer-help', description: 'Offer your time or find volunteers for community efforts', icon: '💪', sortOrder: 33, parentSlug: 'projects-collabs' },
  { name: 'Events & Meetups', slug: 'events-meetups', description: 'Organize or discuss events, meetups, and gatherings', icon: '📅', sortOrder: 34 },
  { name: 'Groups & Local Community', slug: 'groups-local-community', description: 'Local groups, neighborhoods, and community organizing', icon: '🏘️', sortOrder: 35 },
  { name: 'Rentals & Housing', slug: 'rentals-housing', description: 'Rentals, housing, spaces, and equipment', icon: '🏠', sortOrder: 36 },
  { name: 'Skills & Teaching', slug: 'skills-teaching', description: 'Schools, courses, tutoring, and skill sharing', icon: '📚', sortOrder: 37 },
  { name: 'Boards & Pins', slug: 'boards-pins', description: 'Share boards, pins, and location-based discoveries', icon: '📌', sortOrder: 38 },

  // --- Lifestyle ---
  { name: 'Health & Wellness', slug: 'health-wellness', description: 'Health tips, wellness discussions, and self-care', icon: '❤️', sortOrder: 40 },
  { name: 'Gardening & Farming', slug: 'gardening-farming', description: 'Growing tips, farming techniques, and plant care', icon: '🌱', sortOrder: 41 },
  { name: 'Crypto & Private Money', slug: 'crypto-private-money', description: 'Private money, tipping, wallets, and cooperative credit', icon: '🪙', sortOrder: 42 },
  { name: 'Fediverse & Tech', slug: 'fediverse-tech', description: 'ActivityPub, federation, and open tech discussions', icon: '🌐', sortOrder: 43 },
]

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return apiError("Unauthorized", 401)
    }

    const slugsById = new Map<string, string>()
    const created = []
    let createdCount = 0

    for (const cat of DEFAULT_CATEGORIES) {
      let existing = await prisma.forumCategory.findUnique({
        where: { slug: cat.slug },
        select: { id: true, parentId: true, name: true, icon: true, sortOrder: true, description: true },
      })

      const data: {
        name: string
        slug: string
        description: string
        icon: string
        sortOrder: number
        parent?: { connect: { id: string } }
      } = {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      }
      if (cat.parentSlug) {
        const parent = await prisma.forumCategory.findUnique({
          where: { slug: cat.parentSlug },
          select: { id: true },
        })
        if (parent) data.parent = { connect: { id: parent.id } }
      }

      if (existing) {
        // Backfill parent links on previously seeded subcategories.
        const needsParent = cat.parentSlug && existing.parentId === null
        if (needsParent) {
          const parent = await prisma.forumCategory.findUnique({
            where: { slug: cat.parentSlug },
            select: { id: true },
          })
          if (parent) {
            await prisma.forumCategory.update({
              where: { id: existing.id },
              data: { parentId: parent.id, status: 'APPROVED' },
            })
          }
        }
        continue
      }

      const createdCat = await prisma.forumCategory.create({ data })
      if (cat.parentSlug) {
        slugsById.set(cat.slug, createdCat.id)
      }
      created.push(createdCat)
      createdCount += 1
    }

    return NextResponse.json({
      message: `Created ${createdCount} categories`,
      categories: created,
    })
  } catch (error) {
    console.error('Error seeding forum categories:', error)
    return apiError("Failed to seed categories", 500)
  }
}