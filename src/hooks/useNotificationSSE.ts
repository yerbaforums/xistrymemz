'use client'

import { useEffect, useRef, useCallback } from 'react'

interface SSEEvent {
  type: string
  notification?: unknown
  unreadCount?: number
}

export function useNotificationSSE(onEvent: (event: SSEEvent) => void) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  useEffect(() => {
    let es: EventSource

    const connect = () => {
      cleanup()
      es = new EventSource('/api/notifications/stream')
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          onEventRef.current(parsed)
        } catch {}
      }

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
      es.close()
    }
  }, [cleanup])

  return { cleanup }
}
