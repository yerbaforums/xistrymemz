'use client'

import { useState, useMemo } from 'react'
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from '@/types/service'
import styles from './ServiceFilters.module.css'

interface ServiceFiltersProps {
  category: string
  sortBy: string
  priceMin: string
  priceMax: string
  onCategoryChange: (v: string) => void
  onSortChange: (v: string) => void
  onPriceMinChange: (v: string) => void
  onPriceMaxChange: (v: string) => void
  onClear: () => void
}

export default function ServiceFilters({
  category, sortBy, priceMin, priceMax,
  onCategoryChange, onSortChange,
  onPriceMinChange, onPriceMaxChange, onClear
}: ServiceFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeCount = useMemo(() => {
    let count = 0
    if (category !== 'ALL') count++
    if (priceMin || priceMax) count++
    if (sortBy !== 'newest') count++
    return count
  }, [category, priceMin, priceMax, sortBy])

  return (
    <>
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Hide filters' : 'Show filters'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters
        {activeCount > 0 && <span className={styles.countBadge}>{activeCount}</span>}
        <svg
          className={`${styles.chevron} ${mobileOpen ? styles.chevronOpen : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      <aside className={`${styles.aside} ${mobileOpen ? styles.asideOpen : ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </h3>
          {activeCount > 0 && <span className={styles.countLabel}>{activeCount} active</span>}
          <button className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Close filters">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Category</label>
          <select className={styles.select} value={category} onChange={e => onCategoryChange(e.target.value)}>
            <option value="ALL">All Categories</option>
            {SERVICE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{SERVICE_CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        <details className={styles.collapsible} open>
          <summary className={styles.summary}>
            <span>Price Range</span>
            <svg className={styles.summaryChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </summary>
          <div className={styles.collapsibleBody}>
            <div className={styles.priceRow}>
              <input
                className={styles.priceInput}
                type="number" value={priceMin} onChange={e => onPriceMinChange(e.target.value)}
                placeholder="Min"
              />
              <span className={styles.priceSep}>—</span>
              <input
                className={styles.priceInput}
                type="number" value={priceMax} onChange={e => onPriceMaxChange(e.target.value)}
                placeholder="Max"
              />
            </div>
          </div>
        </details>

        <div className={styles.group}>
          <label className={styles.label}>Sort</label>
          <select className={styles.select} value={sortBy} onChange={e => onSortChange(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="duration">Duration: Shortest</option>
            <option value="nearest">📍 Nearest</option>
          </select>
        </div>

        {activeCount > 0 && (
          <button className={styles.clearBtn} onClick={onClear}>
            Clear All Filters
          </button>
        )}
      </aside>
    </>
  )
}
