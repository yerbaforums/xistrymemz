import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import DiscordProvider from 'next-auth/providers/discord'
import TwitterProvider from 'next-auth/providers/twitter'
import FacebookProvider from 'next-auth/providers/facebook'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendVerificationEmail } from './email'

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set')
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'boolean' }
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

        if ((isAdminEmail || isAdminName) && user.role === 'USER') {
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
          username: user.username,
          role: user.role as string,
          rememberMe: credentials.rememberMe === 'true'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days default
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login'
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'credentials') return true

      // OAuth sign-in: find or create user by email
      if (account && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (existingUser) {
          if (existingUser.password) {
            return '/auth/login?error=OAuthAccountNotLinked'
          }
          // Link OAuth provider to existing OAuth-only user
          const existingLink = await prisma.oAuthProvider.findFirst({
            where: {
              userId: existingUser.id,
              provider: account.provider,
            }
          })
          if (!existingLink) {
            await prisma.oAuthProvider.create({
              data: {
                userId: existingUser.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                profile: profile ? JSON.stringify(profile) : null,
              }
            })
          }
          return true
        }

        // Create new user from OAuth profile
        const name = user.name || profile?.name || account.provider.split('-')[0]
        const baseUsername = (name as string)?.toLowerCase().replace(/[^a-z0-9]/g, '') || `user_${Date.now()}`
        let username = baseUsername
        let counter = 1
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter}`
          counter++
        }

        const newUser = await prisma.user.create({
          data: {
            email: user.email,
            name: name as string,
            username,
            password: '', // OAuth users have no password
            image: user.image || null,
          }
        })

        // Send verification email for OAuth signups
        const verifyToken = randomBytes(32).toString('hex')
        prisma.verificationToken.create({
          data: { token: verifyToken, userId: newUser.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
        }).then(() => sendVerificationEmail(newUser.email, verifyToken)).catch(() => {})

        // Auto-connect with founder
        const founder = await prisma.user.findFirst({
          where: {
            OR: [
              { email: 'xb4zy@xistrymemz.xyz' },
              { name: 'xb4zy' }
            ]
          }
        })
        if (founder && founder.id !== newUser.id) {
          await prisma.connection.create({
            data: {
              requesterId: newUser.id,
              receiverId: founder.id,
              status: 'ACCEPTED'
            }
          }).catch(() => {})
        }

        // Link OAuth provider
        await prisma.oAuthProvider.create({
          data: {
            userId: newUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            profile: profile ? JSON.stringify(profile) : null,
          }
        })

        // Subscribe to newsletter
        await prisma.emailSubscriber.upsert({
          where: { email: user.email },
          update: {},
          create: { email: user.email, name: name as string, source: 'oauth_registration' }
        }).catch(() => {})

        return true
      }

      return false
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.username = (user as { username?: string }).username
        token.role = (user as { role?: string }).role || 'USER'
        token.picture = (user as { image?: string | null }).image || null
        if ('rememberMe' in user) {
          token.rememberMe = (user as { rememberMe?: boolean }).rememberMe
        }
      }

      const userId = (token.id as string) || (token.sub as string)
      if (userId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, username: true, image: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.username = dbUser.username
            token.picture = dbUser.image
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
        ;(session.user as typeof session.user & { id: string; role?: string; username?: string }).id = userId
        ;(session.user as typeof session.user & { id: string; role?: string; username?: string }).role = (token.role as string) || 'USER'
        ;(session.user as typeof session.user & { id: string; role?: string; username?: string }).username = token.username as string | undefined
        session.user.image = (token.picture as string) || null
      }
      return session
    }
  }
}