'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import TourOverlay from '@/components/TourOverlay'
import { POST_ONBOARDING_TOUR } from '@/data/onboarding-tour'

export default function DashboardTourWrapper() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !session?.user) return null
  if (pathname !== '/dashboard/overview') return null

  return <TourOverlay tourKey="post-onboarding" steps={POST_ONBOARDING_TOUR} />
}
