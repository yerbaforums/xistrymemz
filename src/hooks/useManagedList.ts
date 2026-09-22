'use client'

import { useCallback, useState } from 'react'

export interface ManagedListOptions {
  initialFilter?: string
  initialView?: 'grid' | 'list'
  /** Persist the chosen view mode to localStorage and restore it on reload. */
  persistView?: boolean
}

/**
 * Shared state for list managers (search / filter pill / view mode).
 * Use together with <ListingToolbar /> for a uniform content-management UX.
 */
export function useManagedList(options: ManagedListOptions = {}) {
  const { initialFilter = 'all', initialView = 'list', persistView = false } = options

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [view, setView] = useState<'grid' | 'list'>(() => {
    if (!persistView || typeof window === 'undefined') return initialView
    const stored = window.localStorage.getItem('managed-list-view')
    return stored === 'grid' || stored === 'list' ? stored : initialView
  })

  const changeView = useCallback((mode: 'grid' | 'list') => {
    setView(mode)
    if (persistView && typeof window !== 'undefined') {
      window.localStorage.setItem('managed-list-view', mode)
    }
  }, [persistView])

  const reset = useCallback(() => {
    setSearch('')
    setFilter(initialFilter)
  }, [initialFilter])

  return { search, setSearch, filter, setFilter, view, changeView, reset }
}