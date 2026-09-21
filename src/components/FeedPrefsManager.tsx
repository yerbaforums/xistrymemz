'use client'

import { useEffect } from 'react'
import { useUserPreferences } from '@/hooks/useUserPreferences'

/**
 * Applies feed display preferences as data attributes on <html> so plain CSS
 * (and MediaPlayer, without per-item fetches) can react to them.
 */
export default function FeedPrefsManager() {
  const { prefs, loaded } = useUserPreferences()

  useEffect(() => {
    if (!loaded) return
    const root = document.documentElement
    root.dataset.feedDensity = prefs?.view?.density === 'compact' ? 'compact' : 'comfortable'
    root.dataset.feedAutoplay = prefs?.view?.autoplay === 'off' ? 'off' : 'on'
  }, [loaded, prefs?.view?.density, prefs?.view?.autoplay])

  return null
}
