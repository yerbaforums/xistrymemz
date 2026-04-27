import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set')
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )
        if (!isPasswordValid) {
          return null
        }

        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        const adminNames = (process.env.ADMIN_NAMES || '').split(',').map(n => n.trim().toLowerCase()).filter(Boolean)
        const isAdminEmail = adminEmails.includes(user.email.toLowerCase())
        const isAdminName = user.name ? adminNames.includes(user.name.toLowerCase()) : false

        if ((isAdminEmail || isAdminName) && user.role !== 'ADMIN') {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
          })
          user.role = 'ADMIN'
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as string
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role || 'USER'
      }

      const userId = (token.id as string) || (token.sub as string)
      if (userId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          })
          if (dbUser) {
            token.role = dbUser.role
          }
        } catch (e) {
          token.role = 'USER'
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const userId = (token.id as string) || (token.sub as string)
        ;(session.user as typeof session.user & { id: string; role?: string }).id = userId
        ;(session.user as typeof session.user & { id: string; role?: string }).role = (token.role as string) || 'USER'
      }
      return session
    }
  }
}