import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const SEED_CATEGORIES = [
  { name: 'General', slug: 'general', icon: '💬', sortOrder: 1 },
  { name: 'Projects', slug: 'projects', icon: '🚀', sortOrder: 2 },
  { name: 'Ideas', slug: 'ideas', icon: '💡', sortOrder: 3 },
  { name: 'Announcements', slug: 'announcements', icon: '📣', sortOrder: 4 },
  { name: 'Help', slug: 'help', icon: '🆘', sortOrder: 5 },
  { name: 'Development', slug: 'development', icon: '🔧', sortOrder: 6 }
]

const SITE_UPDATE_CONTENT = `
# Site Development Updates

Welcome to the Development Updates thread! This is where we'll post notes about each development session.

## v0.3.0 - Earth Passport & Community Updates

### Earth Passport System (NEW!)
- Added Earth ID (unique passport identifier)
- Verification levels: NONE → BASIC → STANDARD → ADVANCED → PREMIUM
- Reputation score system
- Verification badges (Email, Phone, ID, Address)

### Badge System (NEW!)
- Badge model for user achievements
- Badge types: EARLY_ADOPTER, TRUSTED_CONNECTOR, VERIFIED_SELLER, COMMUNITY_BUILDER, MENTOR, GUIDE, PIONEER, EARTH_GUARDIAN
- Tier system: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND

### Order System Updates
- Added PICKED_UP delivery status
- NEW courier flow: PENDING → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
- Courier accept/decline actions
- Price breakdown on order cards
- Full order detail page at /orders/[id]
- Message form on order page

### Connection Updates
- Connection accept/decline functionality
- New /connections page for managing requests
- Added ACCEPTED/REJECTED status

### v0.2.x - Checkout System
- ESCROW vs DIRECT payment options
- Seller payment type configuration
- Dynamic fee calculation (5% direct, 10% escrow)
- Order status timeline

---

**Previous Updates:**
See older posts in this thread for v0.1.x and earlier history.
`

async function seedForumData(userId: string) {
  const existingCategories = await prisma.forumCategory.count()
  if (existingCategories > 0) return

  for (const cat of SEED_CATEGORIES) {
    await prisma.forumCategory.create({
      data: { name: cat.name, slug: cat.slug, icon: cat.icon, sortOrder: cat.sortOrder }
    })
  }

  const devCategory = await prisma.forumCategory.findUnique({ where: { slug: 'development' } })
  if (devCategory) {
    await prisma.forumPost.create({
      data: {
        title: '_site_updates',
        content: SITE_UPDATE_CONTENT,
        authorId: userId,
        categoryId: devCategory.id,
        pinned: true
      }
    })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiSuccess({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { posts: true } }
      }
    })

    const posts = await prisma.forumPost.findMany({
      include: {
        author: { select: { id: true, name: true, username: true, image: true, shopSlug: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { replies: true } }
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 20
    })

    const postsWithMeta = posts.map(p => ({
      ...p,
      totalTips: p.totalTips || 0,
      tippers: p.tippers || 0,
      viewCount: p.viewCount || 0,
      replyCount: p._count?.replies || 0
    }))

    if (categories.length === 0) {
      await seedForumData(session.user.id)
      return NextResponse.redirect('/community/forum')
    }

    return apiSuccess({
      categories: categories.map(c => ({
        ...c,
        _count: { posts: c._count?.posts || 0 }
      })),
      posts: postsWithMeta
    })
  } catch (error) {
    console.error('Error fetching forum data:', error)
    return apiSuccess({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
