'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardSettingsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/profile/settings') }, [router])
  return null
}
