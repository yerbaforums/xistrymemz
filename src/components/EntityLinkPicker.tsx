'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getEntityIcon, getEntityLabel } from '@/lib/entity-icons'
import styles from './EntityLinkPicker.module.css'

export interface PendingLink {
  type: string
  id: string
  title: string
}

interface SearchResult {
  id: string
  title: string
  url: string
  type: string
}

interface EntityLinkPickerProps {
  /** Currently selected links (controlled). */
  value: PendingLink[]
  onChange: (next: PendingLink[]) => void
  /** Entity types offered as searchable categories, e.g. ['PROJECT', 'USER']. */
  types?: string[]
  label?: string
  hint?: string
  /** Hide the type filter and search every entity kind at once. */
  searchAll?: boolean
  max?: number
}

const DEFAULT_TYPES = ['PROJECT', 'PRODUCT', 'SERVICE', 'EVENT', 'REQUEST', 'GROUP', 'USER']

/**
 * Inline live-search picker for cross-linking listings. Searches the shared
 * entity search endpoint (type-filtered or across all types, including users)
 * and returns a set of pending links the parent form commits after the source
 * entity is created.
 */
export default function EntityLinkPicker({
  value,
  onChange,
  types = DEFAULT_TYPES,
  label = '🔗 Link to related items',
  hint,
  searchAll = false,
  max = 8,
}: EntityLinkPickerProps) {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<string>(searchAll ? 'ALL' : types[0] || 'ALL')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const searchSeq = useRef(0)

  const typeOptions = useMemo(() => {
    const base = types.map(t => ({ value: t, label: getEntityLabel(t) }))
    return searchAll ? [{ value: 'ALL', label: 'All types' }, ...base] : base
  }, [types, searchAll])
  const search = useCallback(
    async (q: string, type: string) => {
      if (q.trim().length < 2) {
        ++searchSeq.current // invalidate any in-flight search
        setResults([])
        setSearching(false)
        return
      }
      const seq = ++searchSeq.current
      setSearching(true)
      try {
        // type is either a single entity kind or 'ALL' (every kind at once).
        const res = await fetch(`/api/search/entities?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q.trim())}`)
        // Ignore stale responses so a slow earlier search can't clobber a newer one.
        if (seq !== searchSeq.current) return
        if (res.ok) {
          const data = await res.json()
          setResults(data?.data?.items || data?.items || [])
        } else {
          setResults([])
        }
      } catch {
        if (seq === searchSeq.current) setResults([])
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    },
    [],
  )

  const handleQueryChange = (v: string) => {
    setQuery(v)
    setOpen(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(v, activeType), 300)
  }

  const handleTypeChange = (type: string) => {
    setActiveType(type)
    if (query.trim().length >= 2) {
      if (timer.current) clearTimeout(timer.current)
      search(query, type)
    }
  }

  // Close the results panel on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const addLink = (r: SearchResult) => {
    if (value.some(l => l.type === r.type && l.id === r.id)) return
    if (value.length >= max) return
    onChange([...value, { type: r.type, id: r.id, title: r.title }])
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const removeLink = (type: string, id: string) => {
    onChange(value.filter(l => !(l.type === type && l.id === id)))
  }

  const available = results.filter(r => !value.some(l => l.type === r.type && l.id === r.id))

  return (
    <div className={styles.wrap} ref={boxRef}>
      <label className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}

      {value.length > 0 && (
        <div className={styles.chips}>
          {value.map(l => (
            <span key={`${l.type}:${l.id}`} className={styles.chip}>
              <span aria-hidden="true">{getEntityIcon(l.type)}</span>
              <span className={styles.chipText}>{l.title}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeLink(l.type, l.id)}
                aria-label={`Remove link to ${l.title}`}
                title="Remove"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={styles.searchRow}>
        {!searchAll && typeOptions.length > 1 && (
          <select
            className={styles.typeSelect}
            value={activeType}
            onChange={e => handleTypeChange(e.target.value)}
            aria-label="Filter by type"
          >
            {typeOptions.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          placeholder="Search by name… (2+ characters)"
          disabled={value.length >= max}
          aria-label="Search items to link"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className={styles.results}>
          {searching && <div className={styles.status}>Searching…</div>}
          {!searching && available.length === 0 && (
            <div className={styles.status}>No matches found</div>
          )}
          {!searching && available.map(r => (
            <button
              key={`${r.type}:${r.id}`}
              type="button"
              className={styles.result}
              onClick={() => addLink(r)}
            >
              <span className={styles.resultIcon} aria-hidden="true">{getEntityIcon(r.type)}</span>
              <span className={styles.resultTitle}>{r.title}</span>
              <span className={styles.resultType}>{getEntityLabel(r.type)}</span>
            </button>
          ))}
        </div>
      )}

      {value.length >= max && (
        <p className={styles.hint}>Maximum of {max} links reached.</p>
      )}
    </div>
  )
}

/**
 * Commit pending links once the source entity exists. Fire-and-forget: a
 * failed link never blocks or fails the creation flow.
 */
export async function commitPendingLinks(
  sourceType: string,
  sourceId: string,
  links: PendingLink[],
): Promise<void> {
  if (!sourceId || links.length === 0) return
  await Promise.allSettled(
    links.map(link =>
      fetch('/api/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          targetType: link.type,
          targetId: link.id,
          relationType: 'REFERENCES',
        }),
      }),
    ),
  )
}
