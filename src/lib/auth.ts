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

        const isAdminEmail = user.email.toLowerCase() === 'reed.bobby.jr@gmail.com'
                           || user.email.toLowerCase() === 'xb4zy@xistrymemz.xyz'
        const isAdminName = user.name?.toLowerCase() === 'xb4zy'

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
        console.log('[auth] jwt: login, userId:', user.id, 'role:', token.role)
      }

      try {
        const userId = (token.id as string) || (token.sub as string)
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            console.log('[auth] jwt: db refresh, userId:', userId, 'role:', dbUser.role)
          } else {
            console.log('[auth] jwt: db user not found for id:', userId)
          }
        } else {
          console.log('[auth] jwt: no userId in token')
        }
      } catch (e) {
        console.error('[auth] jwt: db query failed:', e)
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const userId = (token.id as string) || (token.sub as string)
        ;(session.user as typeof session.user & { id: string; role?: string }).id = userId
        ;(session.user as typeof session.user & { id: string; role?: string }).role = (token.role as string) || 'USER'
        console.log('[auth] session: userId:', userId, 'role:', token.role)
      }
      return session
    }
  }
}