'use client'

import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from '@/types/service'

interface ServiceFiltersProps {
  category: string
  location: string
  locations: string[]
  sortBy: string
  onCategoryChange: (v: string) => void
  onLocationChange: (v: string) => void
  onSortChange: (v: string) => void
  onClear: () => void
}

export default function ServiceFilters({
  category, location, locations, sortBy,
  onCategoryChange, onLocationChange, onSortChange, onClear
}: ServiceFiltersProps) {
  const hasActiveFilters = category !== 'ALL' || location !== 'ALL'

  return (
    <aside style={{ width: 240, flexShrink: 0 }}>
      <h3 style={{ fontSize: '0.9rem', margin: '0 0 16px', color: 'var(--text-primary)' }}>
        Filters
      </h3>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Category
        </label>
        <select
          value={category}
          onChange={e => onCategoryChange(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            fontSize: '0.82rem'
          }}
        >
          <option value="ALL">All Categories</option>
          {SERVICE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{SERVICE_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Location
        </label>
        <select
          value={location}
          onChange={e => onLocationChange(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            fontSize: '0.82rem'
          }}
        >
          <option value="ALL">All Locations</option>
          {locations.map(loc => (
            <option key={loc} value={loc!}>{loc}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Sort
        </label>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            fontSize: '0.82rem'
          }}
        >
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="duration">Duration: Shortest</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClear}
          style={{
            width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          Clear All Filters
        </button>
      )}
    </aside>
  )
}
