import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import BlogSetupClient from './BlogSetupClient'

export const dynamic = 'force-dynamic'

export default async function BlogSetupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/login?callbackUrl=/blog/setup')
  }
  return <BlogSetupClient />
}