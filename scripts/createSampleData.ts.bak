import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function createSampleData() {
  console.log('Creating sample data...')
  
  // Get users
  const user1 = await prisma.user.findUnique({ where: { email: 'testuser1@example.com' } })
  const user2 = await prisma.user.findUnique({ where: { email: 'testuser2@example.com' } })
  const user3 = await prisma.user.findUnique({ where: { email: 'testuser3@example.com' } })
  const seller = await prisma.user.findUnique({ where: { email: 'seller@example.com' } })
  
  if (!user1 || !user2 || !user3 || !seller) {
    console.error('Users not found')
    return
  }
  
  // Create Plans (Projects)
  const plans = [
    { userId: user1.id, title: 'Community Garden Project', description: 'Building a community garden in downtown area', published: true },
    { userId: user2.id, title: 'Tech Meetup 2024', description: 'Monthly technology networking event', published: true },
    { userId: user3.id, title: 'Art Festival Planning', description: 'Annual art festival organization', published: true },
  ]
  
  console.log('Creating Plans...')
  for (const planData of plans) {
    const plan = await prisma.plan.create({ data: planData })
    console.log(`  Created plan: ${plan.title} (${plan.id})`)
  }
  
  // Create Products
  const products = [
    { userId: seller.id, title: 'Vintage Camera', description: 'Classic 35mm film camera in working condition', price: 150, type: 'PRODUCT', category: 'Electronics', isGlobal: false, location: 'New York, NY' },
    { userId: seller.id, title: 'Web Development Service', description: 'Professional web development for small businesses', price: 500, type: 'SERVICE', category: 'Technology', isGlobal: true },
    { userId: seller.id, title: 'Handmade Candles', description: 'Artisan scented candles', price: 25, type: 'PRODUCT', category: 'Home & Garden', isGlobal: false, location: 'Los Angeles, CA' },
    { userId: seller.id, title: 'Photography Sessions', description: 'Professional photo shoots', price: 200, type: 'SERVICE', category: 'Services', isGlobal: true },
  ]
  
  console.log('Creating Products...')
  for (const productData of products) {
    const product = await prisma.product.create({ data: productData })
    console.log(`  Created product: ${product.title} (${product.id})`)
  }
  
  // Create Requests
  const requests = [
    { userId: user1.id, title: 'Need help with coding', description: 'Looking for a developer to help with a web app', category: 'HELP', priority: 'HIGH', budget: 500, isPublic: true, location: 'Remote' },
    { userId: user2.id, title: 'Seeking marketing advice', description: 'Need consultation on marketing strategy', category: 'COLLABORATION', priority: 'MEDIUM', budget: 200, isPublic: true, location: 'Chicago, IL' },
    { userId: user3.id, title: 'Looking for design partner', description: 'Need a designer for a new project', category: 'IDEA', priority: 'LOW', isPublic: true },
    { userId: seller.id, title: 'Want to buy vintage furniture', description: 'Looking for mid-century modern pieces', category: 'PRODUCT', priority: 'MEDIUM', budget: 300, isPublic: true, location: 'San Francisco, CA' },
  ]
  
  console.log('Creating Requests...')
  for (const requestData of requests) {
    const request = await prisma.request.create({ data: requestData })
    console.log(`  Created request: ${request.title} (${request.id})`)
  }
  
  // Create Groups
  console.log('Creating Groups...')
  const group1 = await prisma.group.create({
    data: { name: 'Tech Enthusiasts', description: 'Group for tech lovers', userId: user1.id }
  })
  console.log(`  Created group: ${group1.name}`)
  
  const group2 = await prisma.group.create({
    data: { name: 'Local Artists', description: 'Connect with local artists', userId: user2.id }
  })
  console.log(`  Created group: ${group2.name}`)
  
  // Create Group Members
  await prisma.groupMember.createMany({
    data: [
      { groupId: group1.id, userId: user1.id, role: 'ADMIN' },
      { groupId: group1.id, userId: user2.id, role: 'MEMBER' },
      { groupId: group2.id, userId: user2.id, role: 'ADMIN' },
      { groupId: group2.id, userId: user3.id, role: 'MEMBER' },
    ]
  })
  console.log('  Added group members')
  
  // Create Events
  console.log('Creating Events...')
  const event1 = await prisma.groupEvent.create({
    data: {
      title: 'Summer Tech Conference',
      description: 'Annual tech conference with speakers and networking',
      eventCategory: 'GROUP',
      eventDate: new Date('2024-06-15T14:00:00Z'),
      location: 'Convention Center, NY',
      maxJoiners: 100,
      organizerId: user1.id,
      groupId: group1.id
    }
  })
  console.log(`  Created event: ${event1.title}`)
  
  // Create School Content
  console.log('Creating School Content...')
  const content1 = await prisma.schoolContent.create({
    data: {
      title: 'Introduction to Web Development',
      content: 'Learn the basics of HTML, CSS, and JavaScript in this comprehensive course.',
      contentType: 'course',
      price: 49.99,
      isPaid: true,
      userId: seller.id,
      authorId: seller.id
    }
  })
  console.log(`  Created school content: ${content1.title}`)
  
  // Create Community Posts
  console.log('Creating Community Posts...')
  const posts = [
    { userId: user1.id, content: 'Excited to announce our community garden project is starting! 🌱' },
    { userId: user2.id, content: 'Looking for collaborators on a new mobile app idea. DM me!' },
    { userId: user3.id, content: 'Anyone interested in organizing a local art walk this summer?' },
  ]
  
  for (const postData of posts) {
    const post = await prisma.post.create({ data: postData })
    console.log(`  Created post: ${post.id.substring(0, 8)}...`)
  }
  
  console.log('\n✅ Sample data created successfully!')
  console.log('\nTest users:')
  console.log('  testuser1@example.com / Test123!')
  console.log('  testuser2@example.com / Test123!')
  console.log('  testuser3@example.com / Test123!')
  console.log('  seller@example.com / Test123!')
  console.log('  provider@example.com / Test123!')
}

createSampleData().catch(console.error).finally(() => prisma.$disconnect())