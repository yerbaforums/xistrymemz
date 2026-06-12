'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import TourOverlay from '@/components/TourOverlay'
import { HOME_WELCOME_TOUR } from '@/data/onboarding-tour'

export default function HomeTourWrapper() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (session?.user) return null
  if (pathname !== '/') return null

  return <TourOverlay tourKey="home-welcome" steps={HOME_WELCOME_TOUR} />
}
