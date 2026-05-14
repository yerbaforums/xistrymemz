'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type ThemeMode = 'dark' | 'light'
type ThemeAccent = 'cyan' | 'purple' | 'green' | 'orange' | 'pink' | 'blue'

interface ThemeContextValue {
  mode: ThemeMode
  accent: ThemeAccent
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: ThemeAccent) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY_MODE = 'xistry-theme-mode'
const STORAGE_KEY_ACCENT = 'xistry-theme-accent'

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY_MODE)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getInitialAccent(): ThemeAccent {
  if (typeof window === 'undefined') return 'cyan'
  const stored = localStorage.getItem(STORAGE_KEY_ACCENT)
  if (stored && ['cyan', 'purple', 'green', 'orange', 'pink', 'blue'].includes(stored)) return stored as ThemeAccent
  return 'cyan'
}

function applyTheme(mode: ThemeMode, accent: ThemeAccent) {
  const root = document.documentElement
  root.setAttribute('data-theme-mode', mode)
  root.setAttribute('data-theme-accent', accent)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)
  const [accent, setAccentState] = useState<ThemeAccent>(getInitialAccent)

  useEffect(() => {
    applyTheme(mode, accent)
  }, [mode, accent])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY_MODE, newMode)
  }, [])

  const setAccent = useCallback((newAccent: ThemeAccent) => {
    setAccentState(newAccent)
    localStorage.setItem(STORAGE_KEY_ACCENT, newAccent)
  }, [])

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY_MODE, next)
      return next
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY_MODE)) {
        setModeState(e.matches ? 'light' : 'dark')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export type { ThemeMode, ThemeAccent }
