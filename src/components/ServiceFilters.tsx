'use client'

import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from '@/types/service'
import styles from './ServiceFilters.module.css'

interface ServiceFiltersProps {
  category: string
  location: string
  locations: string[]
  sortBy: string
  priceMin: string
  priceMax: string
  onCategoryChange: (v: string) => void
  onLocationChange: (v: string) => void
  onSortChange: (v: string) => void
  onPriceMinChange: (v: string) => void
  onPriceMaxChange: (v: string) => void
  onClear: () => void
}

export default function ServiceFilters({
  category, location, locations, sortBy, priceMin, priceMax,
  onCategoryChange, onLocationChange, onSortChange,
  onPriceMinChange, onPriceMaxChange, onClear
}: ServiceFiltersProps) {
  const hasActiveFilters = category !== 'ALL' || location !== 'ALL' || priceMin || priceMax

  return (
    <aside className={styles.aside}>
      <h3 className={styles.title}>Filters</h3>

      <div className={styles.group}>
        <label className={styles.label}>Category</label>
        <select className={styles.select} value={category} onChange={e => onCategoryChange(e.target.value)}>
          <option value="ALL">All Categories</option>
          {SERVICE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{SERVICE_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Location</label>
        <select className={styles.select} value={location} onChange={e => onLocationChange(e.target.value)}>
          <option value="ALL">All Locations</option>
          {locations.map(loc => (
            <option key={loc} value={loc!}>{loc}</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Price Range</label>
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

      <div className={styles.group}>
        <label className={styles.label}>Sort</label>
        <select className={styles.select} value={sortBy} onChange={e => onSortChange(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="duration">Duration: Shortest</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button className={styles.clearBtn} onClick={onClear}>
          Clear All Filters
        </button>
      )}
    </aside>
  )
}
