import { prisma } from '@/lib/prisma'

describe('/api/courier', () => {
  let testUser: any

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'courier-test@test.com',
        password: 'hashed',
        name: 'Courier Test User'
      }
    })
  })

  afterEach(async () => {
    await prisma.courierService.deleteMany()
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/courier', () => {
    it('should create courier service', async () => {
      const res = await fetch('http://localhost/api/courier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          name: 'Test Delivery',
          serviceType: 'DELIVERY',
          basePrice: 10.00,
          pricePerMile: 1.50,
          maxDistance: 25
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Test Delivery')
    })

    it('should reject without required fields', async () => {
      const res = await fetch('http://localhost/api/courier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/courier', () => {
    it('should return user services', async () => {
      await prisma.courierService.create({
        data: {
          name: 'Test Service',
          serviceType: 'DELIVERY',
          basePrice: 10,
          pricePerMile: 1.5,
          maxDistance: 25,
          userId: testUser.id
        }
      })

      const res = await fetch(`http://localhost/api/courier?userId=${testUser.id}`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
