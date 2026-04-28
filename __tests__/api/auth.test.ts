/// <reference types="jest" />
import { NextRequest } from 'next/server'
import { POST as login } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// Mock NextAuth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: () => (req: NextRequest) => {
    if (req.method === 'POST') {
      return login(req)
    }
  },
  getServerSession: jest.fn(() => null)
}))

describe('/api/auth', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
      })

      const res = await fetch(req)
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.email).toBe('test@example.com')
      expect(data.name).toBe('Test User')
    })

    it('should reject registration with invalid email', async () => {
      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123'
        })
      })

      const res = await fetch(req)
      expect(res.status).toBe(400)
    })

    it('should reject duplicate email registration', async () => {
      // First registration
      await prisma.user.create({
        data: {
          email: 'existing@test.com',
          password: 'hashed',
          name: 'Existing'
        }
      })

      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@test.com',
          password: 'password123'
        })
      })

      const res = await fetch(req)
      expect(res.status).toBe(400)
    })
  })
})
