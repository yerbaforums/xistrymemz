'use client'

import { useCallback } from 'react'
import styles from './ProductFilters.module.css'

interface ProductFiltersProps {
  type: string
  category: string
  location: string
  condition: string
  showGlobal: boolean
  priceMin: string
  priceMax: string
  zipCode: string
  radius: string
  geocodingLoading: boolean
  hasPassportLocation: boolean
  categories: (string | null)[]
  locations: (string | null)[]
  onTypeChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onLocationChange: (v: string) => void
  onConditionChange: (v: string) => void
  onShowGlobalChange: (v: boolean) => void
  onPriceMinChange: (v: string) => void
  onPriceMaxChange: (v: string) => void
  onZipCodeChange: (v: string) => void
  onRadiusChange: (v: string) => void
  onGeocode: () => void
  onClear: () => void
  onUsePassportLocation: () => void
}

export default function ProductFilters({
  type, category, location, condition, showGlobal,
  priceMin, priceMax, zipCode, radius, geocodingLoading,
  hasPassportLocation, categories, locations,
  onTypeChange, onCategoryChange, onLocationChange, onConditionChange,
  onShowGlobalChange, onPriceMinChange, onPriceMaxChange,
  onZipCodeChange, onRadiusChange, onGeocode, onClear,
  onUsePassportLocation,
}: ProductFiltersProps) {
  const conditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters
      </h2>

      <div className={styles.group}>
        <label className={styles.label}>Type</label>
        <select value={type} onChange={e => onTypeChange(e.target.value)} className={styles.select}>
          <option value="ALL">All Types</option>
          <option value="PRODUCT">Products</option>
          <option value="SERVICE">Services</option>
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

      <div className={styles.divider} />

      <div className={styles.group}>
        <label className={styles.label}>Price Range</label>
        <div className={styles.priceRow}>
          <input type="number" value={priceMin} onChange={e => onPriceMinChange(e.target.value)} placeholder="Min" className={styles.input} />
          <span className={styles.sep}>-</span>
          <input type="number" value={priceMax} onChange={e => onPriceMaxChange(e.target.value)} placeholder="Max" className={styles.input} />
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={showGlobal} onChange={e => onShowGlobalChange(e.target.checked)} />
          Global listings only
        </label>
      </div>

      <div className={styles.divider} />

      <div className={styles.group}>
        <label className={styles.label}>Distance from ZIP</label>
        <div className={styles.zipCol}>
          <input type="text" value={zipCode} onChange={e => onZipCodeChange(e.target.value)} placeholder="Enter ZIP code" className={styles.input} />
          <div className={styles.zipRow}>
            <select value={radius} onChange={e => onRadiusChange(e.target.value)} className={styles.select} disabled={!zipCode.trim()}>
              <option value="5">5 mi</option>
              <option value="10">10 mi</option>
              <option value="25">25 mi</option>
              <option value="50">50 mi</option>
              <option value="100">100 mi</option>
            </select>
            <button onClick={onGeocode} className={styles.zipBtn} disabled={geocodingLoading || !zipCode.trim()}>
              {geocodingLoading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.spin}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              ) : 'Go'}
            </button>
          </div>
        </div>
        {hasPassportLocation && (
          <button onClick={onUsePassportLocation} className={styles.nearBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Near Me
          </button>
        )}
      </div>

      <button onClick={onClear} className={styles.clearBtn}>
        Clear All Filters
      </button>
    </aside>
  )
}
