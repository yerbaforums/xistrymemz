import { prisma } from '@/lib/prisma'

describe('/api/plans', () => {
  let testUser: any

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'plan-test@test.com',
        password: 'hashed',
        name: 'Plan Test User'
      }
    })
  })

  afterEach(async () => {
    await prisma.plan.deleteMany()
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/plans', () => {
    it('should create a new plan', async () => {
      const res = await fetch('http://localhost/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          title: 'Test Plan',
          description: 'A test plan'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Test Plan')
    })

    it('should reject plan without title', async () => {
      const res = await fetch('http://localhost/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          description: 'No title'
        })
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/plans', () => {
    it('should return list of plans', async () => {
      await prisma.plan.create({
        data: {
          title: 'Public Plan',
          description: 'Test',
          status: 'PUBLIC',
          userId: testUser.id
        }
      })

      const res = await fetch('http://localhost/api/plans')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
