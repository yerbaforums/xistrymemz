'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

export interface UserPreferences {
  theme?: { mode?: 'light' | 'dark'; accent?: string }
  view?: Record<string, string>
  tools?: Record<string, boolean>
  notifications?: Record<string, boolean>
  delivery?: Record<string, boolean>
}

export function useUserPreferences() {
  const { data: session, status } = useSession()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoaded(true)
      return
    }
    setLoading(true)
    fetch('/api/user/preferences')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.preferences) setPrefs(data.preferences)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setLoaded(true)
      })
  }, [status, session?.user?.id])

  const setPreference = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPrefs(prev => {
        const next = mergePrefs(prev || {}, patch)
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          fetch('/api/user/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          }).catch(() => {})
        }, 400)
        return next
      })
    },
    [],
  )

  const isToolVisible = useCallback(
    (href: string): boolean => {
      if (!prefs?.tools) return true
      const v = prefs.tools[href]
      return v !== false
    },
    [prefs],
  )

  const notifEnabled = useCallback(
    (id: string): boolean => {
      if (!prefs?.notifications) return true
      const v = prefs.notifications[id]
      return v !== false
    },
    [prefs],
  )

  const deliveryEnabled = useCallback(
    (id: string): boolean => {
      if (!prefs?.delivery) return id !== 'push'
      return prefs.delivery[id] !== false
    },
    [prefs],
  )

  return { prefs, loading, loaded, setPreference, isToolVisible, notifEnabled, deliveryEnabled }
}

function mergePrefs(base: UserPreferences, patch: Partial<UserPreferences>): UserPreferences {
  const result: UserPreferences = { ...base }
  for (const key of Object.keys(patch) as Array<keyof UserPreferences>) {
    const v = patch[key]
    if (v === undefined || v === null) continue
    const baseVal = base[key]
    if (
      typeof baseVal === 'object' && baseVal !== null &&
      typeof v === 'object' && v !== null && !Array.isArray(v)
    ) {
      ;(result[key] as Record<string, unknown>) = {
        ...(baseVal as Record<string, unknown>),
        ...(v as Record<string, unknown>),
      }
    } else {
      ;(result[key] as unknown) = v
    }
  }
  return result
}