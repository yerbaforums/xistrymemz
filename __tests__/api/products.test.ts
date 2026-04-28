import { prisma } from '@/lib/prisma'

describe('/api/products', () => {
  let testUser: any
  let testProduct: any

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'product-test@test.com',
        password: 'hashed',
        name: 'Product Test User',
        shopName: 'Test Shop'
      }
    })
  })

  afterEach(async () => {
    await prisma.product.deleteMany()
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/products', () => {
    it('should create a new product with valid data', async () => {
      const res = await fetch('http://localhost/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          title: 'Test Product',
          description: 'A test product',
          price: 29.99,
          type: 'PRODUCT',
          category: 'Electronics'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Test Product')
      expect(data.price).toBe(29.99)
      expect(data.type).toBe('PRODUCT')
    })

    it('should reject product without title', async () => {
      const res = await fetch('http://localhost/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          description: 'No title provided'
        })
      })

      expect(res.status).toBe(400)
    })

    it('should create service type product', async () => {
      const res = await fetch('http://localhost/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          title: 'Consulting Service',
          price: 50.00,
          type: 'SERVICE',
          category: 'Consulting'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('SERVICE')
    })
  })

  describe('GET /api/products', () => {
    beforeEach(async () => {
      testProduct = await prisma.product.create({
        data: {
          title: 'Test Product',
          description: 'Test',
          price: 10.00,
          type: 'PRODUCT',
          category: 'Test',
          published: true,
          userId: testUser.id
        }
      })
    })

    it('should return published products', async () => {
      const res = await fetch('http://localhost/api/products')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
