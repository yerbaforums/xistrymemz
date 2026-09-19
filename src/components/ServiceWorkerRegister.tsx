'use client'

import { useEffect } from 'react'

/**
 * Registers the PWA service worker. Deliberately lightweight: registration is
 * production-only, never blocks rendering, and self-heals on activation.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      } catch {
        // Service worker is a progressive enhancement; never fail the app.
      }
    }
    // Wait for the page to be stable before registering.
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}