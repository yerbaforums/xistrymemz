'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { NAV, DASHBOARD_SIDEBAR } from '@/lib/navigation'
import styles from './CommandPalette.module.css'

interface NavEntry {
  label: string
  href: string
  icon: string
  group: string
  keywords: string
}

function buildNavEntries(): NavEntry[] {
  const groups: { items: { label: string; href: string; icon: string }[]; group: string }[] = [
    { items: NAV.main, group: 'Dashboard' },
    { items: NAV.explore, group: 'Browse' },
    { items: NAV.community, group: 'Community' },
    { items: DASHBOARD_SIDEBAR, group: 'Studio' },
    { items: NAV.admin, group: 'Admin' },
  ]

  const seen = new Set<string>()
  const entries: NavEntry[] = []
  for (const { items, group } of groups) {
    for (const item of items) {
      if (seen.has(item.href)) continue
      seen.add(item.href)
      entries.push({
        label: item.label,
        href: item.href,
        icon: item.icon,
        group,
        keywords: `${item.label} ${item.href}`.toLowerCase(),
      })
    }
  }
  return entries
}

interface SearchGroup {
  section: string
  icon: string
  href: string
  label: string
}

interface SearchResultItem {
  id: string
  url: string
  title?: string
  name?: string
  tag?: string
  postCount?: number
}

interface SearchResults {
  projects?: SearchResultItem[]
  products?: SearchResultItem[]
  services?: SearchResultItem[]
  users?: SearchResultItem[]
  groups?: SearchResultItem[]
  events?: SearchResultItem[]
  requests?: SearchResultItem[]
  hashtags?: SearchResultItem[]
  schoolContent?: SearchResultItem[]
}

const SEARCH_ICONS: Record<string, string> = {
  projects: '🚀',
  products: '🛒',
  services: '🔧',
  users: '👤',
  groups: '👥',
  events: '📅',
  requests: '📝',
  hashtags: '#',
  schoolContent: '📚',
}

export default function CommandPalette() {
  const allEntries = useMemo(buildNavEntries, [])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      const t = setTimeout(() => inputRef.current?.focus(), 10)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSearch = async (value: string) => {
    setQuery(value)
    const q = value.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      if (!res.ok) return
      const data = await res.json()
      setResults(data.results)
    } catch {
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  const q = query.trim()
  const hasQuery = q.length >= 2
  const navMatches = allEntries.filter(e => {
    if (!q) return true
    return e.keywords.includes(q.toLowerCase()) || e.label.toLowerCase().includes(q.toLowerCase())
  }).slice(0, 12)

  const searchGroups: SearchGroup[] = []
  if (results) {
    const map: Record<string, string> = {
      projects: 'Projects',
      products: 'Products',
      services: 'Services',
      users: 'Users',
      groups: 'Groups',
      events: 'Events',
      requests: 'Requests',
      schoolContent: 'School Content',
      hashtags: 'Hashtags',
    }
    for (const [key, label] of Object.entries(map)) {
      const items = results[key as keyof SearchResults]
      for (const it of items || []) {
        searchGroups.push({
          section: label,
          icon: SEARCH_ICONS[key] || '',
          href: it.url,
          label: it.title || it.name || it.tag || '',
        })
      }
    }
  }

  if (!open) return null

  const groupedNav = navMatches.reduce<Record<string, NavEntry[]>>((acc, e) => {
    ;(acc[e.group] = acc[e.group] || []).push(e)
    return acc
  }, {})

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.inputWrap}>
          <span className={styles.chevron}>❯</span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search everything, or type a command..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            aria-label="Search the site or jump to a page"
          />
          <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {hasQuery && searching && <div className={styles.muted}>Searching...</div>}

          {hasQuery && !searching && (
            <>
              {searchGroups.length === 0 && (
                <div className={styles.muted}>No results for “{q}”</div>
              )}
              <div className={styles.group}>
                {searchGroups.map((g, i) => (
                  <Link key={`${g.section}-${i}`} href={g.href} className={styles.item} onClick={() => setOpen(false)}>
                    <span className={styles.itemIcon}>{g.icon}</span>
                    <span className={styles.itemLabel}>{g.label}</span>
                    <span className={styles.itemSection}>{g.section}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {!hasQuery && (
            <div className={styles.group}>
              {Object.entries(groupedNav).map(([group, items]) => (
                <div key={group} className={styles.navGroup}>
                  <div className={styles.navGroupTitle}>{group}</div>
                  {items.map(item => (
                    <Link key={item.href} href={item.href} className={styles.item} onClick={() => setOpen(false)}>
                      <span className={styles.itemIcon}>{item.icon}</span>
                      <span className={styles.itemLabel}>{item.label}</span>
                      <span className={styles.itemShortcut}>{item.href}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <span><kbd>esc</kbd> to close</span>
            <span><kbd>⌘K</kbd> to toggle</span>
          </div>
        </div>
      </div>
    </div>
  )
}