/**
 * @jest-environment node
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

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
        shopName: 'Test Shop',
        shopSlug: 'test-shop'
      }
    })
  })

  afterEach(async () => {
    await prisma.productHashtag.deleteMany()
    await prisma.hashtag.deleteMany()
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
      const res = await fetch(`${BASE_URL}/api/products`, {
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
      const res = await fetch(`${BASE_URL}/api/products`, {
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
      const res = await fetch(`${BASE_URL}/api/products`, {
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

    it('should create hashtags from description', async () => {
      const res = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          title: 'Tagged Product',
          description: 'A great #electronics #gadget for sale',
          price: 99.99,
          type: 'PRODUCT'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()

      const tags = await prisma.productHashtag.findMany({
        where: { productId: data.id },
        include: { hashtag: true }
      })
      const tagNames = tags.map(t => t.hashtag.tag)
      expect(tagNames).toContain('electronics')
      expect(tagNames).toContain('gadget')
    })

    it('should create hashtags from explicit hashtags field', async () => {
      const res = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          title: 'Hashtag Product',
          price: 49.99,
          type: 'PRODUCT',
          hashtags: ['vintage', 'collectible']
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()

      const tags = await prisma.productHashtag.findMany({
        where: { productId: data.id },
        include: { hashtag: true }
      })
      const tagNames = tags.map(t => t.hashtag.tag)
      expect(tagNames).toContain('vintage')
      expect(tagNames).toContain('collectible')
    })

    it('should create a rental product with all fields', async () => {
      const res = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          title: 'Camera Rental',
          type: 'RENTAL',
          rentalDaily: 25,
          rentalWeekly: 140,
          rentalMonthly: 400,
          rentalDeposit: 200,
          rentalMinDays: 1,
          rentalMaxDays: 30,
          rentalAvailable: true,
          category: 'Photography'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('RENTAL')
      expect(data.rentalDaily).toBe(25)
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
      const res = await fetch(`${BASE_URL}/api/products`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data.products)).toBe(true)
    })

    it('should filter by hashtag', async () => {
      const hashtag = await prisma.hashtag.create({ data: { tag: 'testtag' } })
      await prisma.productHashtag.create({
        data: { productId: testProduct.id, hashtagId: hashtag.id, sourceType: 'PRODUCT' }
      })
      await prisma.hashtag.update({
        where: { id: hashtag.id },
        data: { postCount: { increment: 1 } }
      })

      const res = await fetch(`${BASE_URL}/api/products?hashtag=testtag`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.products.length).toBeGreaterThanOrEqual(1)
      expect(data.products[0].id).toBe(testProduct.id)
    })
  })
})
