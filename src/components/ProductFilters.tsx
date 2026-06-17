'use client'

import { useState, useMemo } from 'react'
import { PRODUCT_CONDITIONS } from '@/lib/product-categories'
import styles from './ProductFilters.module.css'

interface ProductFiltersProps {
  type: string
  category: string
  location: string
  condition: string
  priceMin: string
  priceMax: string
  categories: (string | null)[]
  locations: (string | null)[]
  onTypeChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onLocationChange: (v: string) => void
  onConditionChange: (v: string) => void
  onPriceMinChange: (v: string) => void
  onPriceMaxChange: (v: string) => void
  onClear: () => void
}

export default function ProductFilters({
  type, category, location, condition,
  priceMin, priceMax,
  categories, locations,
  onTypeChange, onCategoryChange, onLocationChange, onConditionChange,
  onPriceMinChange, onPriceMaxChange, onClear,
}: ProductFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const conditions = [...PRODUCT_CONDITIONS]

  const activeCount = useMemo(() => {
    let count = 0
    if (type !== 'ALL') count++
    if (category !== 'ALL') count++
    if (location !== 'ALL') count++
    if (condition !== 'ALL') count++
    if (priceMin || priceMax) count++
    return count
  }, [type, category, location, condition, priceMin, priceMax])

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

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </h2>
          {activeCount > 0 && <span className={styles.countLabel}>{activeCount} active</span>}
          <button className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Close filters">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Type</label>
          <select value={type} onChange={e => onTypeChange(e.target.value)} className={styles.select}>
            <option value="ALL">All Types</option>
            <option value="PRODUCT">Products</option>
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => onCategoryChange(e.target.value)} className={styles.select}>
            <option value="ALL">All Categories</option>
            {categories.map(cat => cat && (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Location</label>
          <select value={location} onChange={e => onLocationChange(e.target.value)} className={styles.select}>
            <option value="ALL">All Locations</option>
            <option value="GLOBAL">Global</option>
            {locations.filter(l => l !== 'GLOBAL').map(loc => loc && (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Condition</label>
          <select value={condition} onChange={e => onConditionChange(e.target.value)} className={styles.select}>
            <option value="ALL">Any Condition</option>
            {conditions.map(cond => (
              <option key={cond} value={cond}>{cond.replace('_', ' ')}</option>
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
              <input type="number" value={priceMin} onChange={e => onPriceMinChange(e.target.value)} placeholder="Min" className={styles.input} />
              <span className={styles.sep}>-</span>
              <input type="number" value={priceMax} onChange={e => onPriceMaxChange(e.target.value)} placeholder="Max" className={styles.input} />
            </div>
          </div>
        </details>

        <button onClick={onClear} className={styles.clearBtn}>
          Clear All Filters
        </button>
      </aside>
    </>
  )
}
