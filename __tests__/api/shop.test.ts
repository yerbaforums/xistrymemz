/// <reference types="jest" />
import { prisma } from '@/lib/prisma'

describe('/api/shop', () => {
  let testUser: any

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'shop-test@test.com',
        password: 'hashed',
        name: 'Shop Test User'
      }
    })
  })

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /api/shop', () => {
    it('should return null for user without shop', async () => {
      const res = await fetch('http://localhost/api/shop', {
        headers: { 'x-user-id': testUser.id }
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.shopName).toBeNull()
    })
  })

  describe('PUT /api/shop', () => {
    it('should create shop profile', async () => {
      const res = await fetch('http://localhost/api/shop', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          shopName: 'Test Shop',
          shopAbout: 'A test shop',
          shopImage: 'http://example.com/image.jpg'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.shopName).toBe('Test Shop')
    })

    it('should update existing shop', async () => {
      // First create shop
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          shopName: 'Old Shop',
          shopAbout: 'Old description'
        }
      })

      const res = await fetch('http://localhost/api/shop', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          shopName: 'Updated Shop',
          shopAbout: 'Updated description'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.shopName).toBe('Updated Shop')
    })
  })
})
