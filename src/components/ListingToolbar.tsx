'use client'

import styles from './ListingToolbar.module.css'

export interface PillOption {
  value: string
  label: string
  count?: number
}

interface ListingToolbarProps {
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  pills?: PillOption[]
  activePill?: string
  onPillChange?: (value: string) => void
  sort?: {
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }
  view?: {
    mode: 'grid' | 'list'
    onChange: (mode: 'grid' | 'list') => void
  }
  count: number
  countLabel?: string
  /** When provided, shows a CSV export button wired to this callback. */
  onExport?: () => void
}

/**
 * Sleek, shared list toolbar: search + filter pills + sort + view toggle + count.
 * Uses the --control-* tokens (toolbar 36px / input 32px / pill 28px / gap 6px).
 */
export default function ListingToolbar({
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  pills,
  activePill,
  onPillChange,
  sort,
  view,
  count,
  countLabel = 'items',
  onExport,
}: ListingToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className={styles.search}
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {pills && pills.length > 0 && (
        <div className={styles.pills} role="tablist" aria-label="Filter">
          {pills.map(pill => (
            <button
              key={pill.value}
              type="button"
              role="tab"
              aria-selected={activePill === pill.value}
              className={`${styles.pill} ${activePill === pill.value ? styles.pillActive : ''}`}
              onClick={() => onPillChange?.(pill.value)}
            >
              {pill.label}
              {typeof pill.count === 'number' && <span className={styles.pillCount}>{pill.count}</span>}
            </button>
          ))}
        </div>
      )}

      {sort && (
        <select
          className={styles.select}
          value={sort.value}
          onChange={e => sort.onChange(e.target.value)}
          aria-label="Sort"
        >
          {sort.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {view && (
        <div className={styles.viewToggle} role="group" aria-label="View mode">
          <button
            type="button"
            className={`${styles.viewBtn} ${view.mode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => view.onChange('list')}
            title="List view"
          >
            ☰
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${view.mode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => view.onChange('grid')}
            title="Grid view"
          >
            ⊞
          </button>
        </div>
      )}

      <div className={styles.right}>
        {onExport && (
          <button type="button" className={styles.exportBtn} onClick={onExport} title="Export as CSV">
            ⬇ CSV
          </button>
        )}
        <span className={styles.count}>
          {count} {countLabel}
        </span>
      </div>
    </div>
  )
}