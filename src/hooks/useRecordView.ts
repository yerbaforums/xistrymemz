'use client'

import { useEffect, useRef } from 'react'

type ContentType = 'post' | 'product' | 'service' | 'request'

export function useRecordView(contentType: ContentType, contentId: string) {
  const recorded = useRef(false)

  useEffect(() => {
    if (!contentId || recorded.current) return
    recorded.current = true

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, contentId }),
      signal: controller.signal,
    }).catch(() => {})

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [contentType, contentId])
}
