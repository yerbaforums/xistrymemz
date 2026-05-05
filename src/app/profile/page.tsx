import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function MyProfilePage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, shopSlug: true, name: true, email: true }
  })
  
  const username = user?.username || user?.shopSlug || user?.name?.toLowerCase().replace(/\s+/g, '-') || user?.email?.split('@')[0]
  
  if (username) {
    redirect(`/profile/${username}`)
  }
  
  redirect('/profile/me')
}