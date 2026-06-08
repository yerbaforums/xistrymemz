'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import TourOverlay from '@/components/TourOverlay'
import { POST_ONBOARDING_TOUR } from '@/data/onboarding-tour'

export default function DashboardTourWrapper() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !session?.user) return null

  const stored = typeof window !== 'undefined' ? localStorage.getItem('tour_post-onboarding') : null
  if (stored === 'completed' || stored === 'skipped') return null

  return <TourOverlay tourKey="post-onboarding" steps={POST_ONBOARDING_TOUR} />
}
