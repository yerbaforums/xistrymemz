'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const MAX_TOASTS = 5

const DURATION_BY_TYPE: Record<ToastType, number> = {
  success: 3000,
  error: 6000,
  warning: 5000,
  info: 4000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
      timeouts.clear()
    }
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const effectiveDuration = duration ?? DURATION_BY_TYPE[type]
    const toast: Toast = { id, message, type, duration: effectiveDuration }

    setToasts(prev => {
      const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
      return [...next, toast]
    })

    if (effectiveDuration > 0) {
      const timeout = setTimeout(() => removeToast(id), effectiveDuration)
      timeoutsRef.current.set(id, timeout)
    }
  }, [removeToast])

  const success = useCallback((message: string, duration?: number) => {
    addToast(message, 'success', duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    addToast(message, 'error', duration)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    addToast(message, 'warning', duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    addToast(message, 'info', duration)
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}