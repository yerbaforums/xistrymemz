import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import PodcastSetupClient from './PodcastSetupClient'

export const dynamic = 'force-dynamic'

export default async function PodcastSetupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/login?callbackUrl=/podcast/setup')
  }
  return <PodcastSetupClient />
}