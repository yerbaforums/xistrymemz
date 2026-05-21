'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const PING_INTERVAL = 5 * 60 * 1000

export function useActivityPing() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return

    const ping = () => {
      fetch('/api/users/ping', { method: 'POST' }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, PING_INTERVAL)
    return () => clearInterval(interval)
  }, [status])
}
