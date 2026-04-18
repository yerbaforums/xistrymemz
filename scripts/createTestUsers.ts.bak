import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const testUsers = [
  { email: 'testuser1@example.com', name: 'Test User One', password: 'Test123!' },
  { email: 'testuser2@example.com', name: 'Test User Two', password: 'Test123!' },
  { email: 'testuser3@example.com', name: 'Test User Three', password: 'Test123!' },
  { email: 'seller@example.com', name: 'Seller Test', password: 'Test123!' },
  { email: 'provider@example.com', name: 'Service Provider', password: 'Test123!' },
]

async function createTestUsers() {
  console.log('Creating test users...')
  
  for (const userData of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    })
    
    if (existing) {
      console.log(`User ${userData.email} already exists, skipping...`)
      continue
    }
    
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
      }
    })
    
    console.log(`Created user: ${user.email} (${user.id})`)
    
    // Create a shop for seller user
    if (userData.email === 'seller@example.com') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          shopName: 'Test Shop',
          shopSlug: 'test-shop',
          shopAbout: 'A test shop for testing'
        }
      })
      console.log('  → Added shop data')
    }
  }
  
  console.log('Done!')
}

createTestUsers().catch(console.error).finally(() => prisma.$disconnect())