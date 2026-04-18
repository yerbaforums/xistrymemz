import { prisma } from '@/lib/prisma'

async function seed() {
  console.log('Seeding forum categories and site updates...')

  const existing = await prisma.forumCategory.count()
  if (existing > 0) {
    console.log('Forum already seeded')
    return
  }

  const categories = [
    { name: 'General', slug: 'general', icon: '💬', sortOrder: 1 },
    { name: 'Projects', slug: 'projects', icon: '🚀', sortOrder: 2 },
    { name: 'Ideas', slug: 'ideas', icon: '💡', sortOrder: 3 },
    { name: 'Announcements', slug: 'announcements', icon: '📣', sortOrder: 4 },
    { name: 'Help', slug: 'help', icon: '🆘', sortOrder: 5 },
    { name: 'Development', slug: 'development', icon: '🔧', sortOrder: 6 }
  ]

  for (const cat of categories) {
    await prisma.forumCategory.create({ data: cat })
  }

  const devCategory = await prisma.forumCategory.findUnique({ where: { slug: 'development' } })
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

  if (devCategory && admin) {
    const siteUpdatesContent = `# 🌍 Earth Passport - Site Development Updates

Welcome to the **Development Updates** thread! This is where we'll post notes about each development session.

---

## v0.3.0 - Earth Passport & Community Updates

### 🌎 Earth Passport System
- **Earth ID** - Unique passport identifier (e.g., "EP-XXXXX")
- **Verification Levels**: NONE → BASIC → STANDARD → ADVANCED → PREMIUM
- **Reputation Score** - Community trust score (0-100)
- **Verification Badges**: Email ✓, Phone ✓, ID ✓, Address ✓

### 🏅 Badge System
- Badge model for user achievements
- Badge types: EARLY_ADOPTER, TRUSTED_CONNECTOR, VERIFIED_SELLER, COMMUNITY_BUILDER, MENTOR, GUIDE, PIONEER, EARTH_GUARDIAN
- Tier system: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND

### 📦 Order System
- **NEW** courier flow: PENDING → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
- Courier accept/decline functionality
- Price breakdown on order cards
- Full order detail page at /orders/[id]
- Message form on order page

### 🤝 Connection Updates
- Connection accept/decline functionality
- New /connections page for managing requests
- Connection status: PENDING → ACCEPTED/REJECTED

### 💳 Checkout System
- ESCROW vs DIRECT payment options
- Seller payment type configuration (ESCROW/DIRECT/BOTH)
- Dynamic fee calculation (5% direct, 10% escrow)

---

## v0.2.x - Order System
- Escrow/Direct payment checkout
- Orders page with status timeline
- Seller payment configuration

---

## v0.1.x - Foundation
- Plans, Requests, Groups, Events
- Products marketplace
- Community forum
- Basic user profiles
- Wallet integration (Tari)

---

*More updates coming soon!*`

    await prisma.forumPost.create({
      data: {
        title: '_site_updates',
        content: siteUpdatesContent,
        authorId: admin.id,
        categoryId: devCategory.id,
        pinned: true
      }
    })

    console.log('Created Development category and site updates thread!')
  }

  console.log('Done seeding!')
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())