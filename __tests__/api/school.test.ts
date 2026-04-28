import { prisma } from '@/lib/prisma'

describe('/api/school', () => {
  let testUser: any

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'school-test@test.com',
        password: 'hashed',
        name: 'School Test User'
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

  describe('GET /api/school', () => {
    it('should return null for user without school', async () => {
      const res = await fetch('http://localhost/api/school', {
        headers: { 'x-user-id': testUser.id }
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.schoolName).toBeNull()
    })
  })

  describe('PUT /api/school', () => {
    it('should create school profile', async () => {
      const res = await fetch('http://localhost/api/school', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUser.id
        },
        body: JSON.stringify({
          schoolName: 'Test School',
          schoolAbout: 'A test school'
        })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.schoolName).toBe('Test School')
    })
  })
})
