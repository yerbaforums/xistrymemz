'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function useRecordVisit() {
  const pathname = usePathname()
  const recorded = useRef<string | null>(null)

  useEffect(() => {
    if (recorded.current === pathname) return
    recorded.current = pathname

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer: document.referrer || null,
        landingPage: pathname,
      }),
      signal: controller.signal,
    }).catch(() => {})

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [pathname])
}
