'use client'

import { useState } from 'react'
import type { EdgeType } from '@/lib/constellation'
import styles from './ConstellationControls.module.css'

export interface FilterOptions {
  collaboratorsOnly?: boolean
  activeOnly?: boolean
  sharedInterestOnly?: boolean
}

interface ConstellationControlsProps {
  onReset: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onEdgeFilterChange: (types: EdgeType[]) => void
  onFilterChange: (filters: FilterOptions) => void
}

export default function ConstellationControls({
  onReset,
  onZoomIn,
  onZoomOut,
  onEdgeFilterChange,
  onFilterChange,
}: ConstellationControlsProps) {
  const [edgeFilters, setEdgeFilters] = useState<EdgeType[]>([])
  const [localFilters, setLocalFilters] = useState<FilterOptions>({})
  const [legendOpen, setLegendOpen] = useState(false)

  const toggleEdge = (type: EdgeType) => {
    const next = edgeFilters.includes(type)
      ? edgeFilters.filter(t => t !== type)
      : [...edgeFilters, type]
    setEdgeFilters(next)
    onEdgeFilterChange(next)
  }

  const updateFilter = (key: keyof FilterOptions, value: boolean) => {
    const next = { ...localFilters, [key]: value }
    setLocalFilters(next)
    onFilterChange(next)
  }

  return (
    <div className={styles.controls}>
      <div className={styles.zoomGroup}>
        <button className={styles.btn} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">+</button>
        <button className={styles.btn} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">−</button>
        <button className={styles.btn} onClick={onReset} aria-label="Fit all" title="Fit all">⛶</button>
      </div>

      <div className={styles.filterGroup}>
        <button
          className={`${styles.filterBtn} ${localFilters.collaboratorsOnly ? styles.filterBtnActive : ''}`}
          onClick={() => updateFilter('collaboratorsOnly', !localFilters.collaboratorsOnly)}
          title="Only members looking for collaborators"
        >
          🤝 Collaborators
        </button>
        <button
          className={`${styles.filterBtn} ${localFilters.activeOnly ? styles.filterBtnActive : ''}`}
          onClick={() => updateFilter('activeOnly', !localFilters.activeOnly)}
          title="Only members active in the last hour"
        >
          🟢 Active
        </button>
        <button
          className={`${styles.filterBtn} ${localFilters.sharedInterestOnly ? styles.filterBtnActive : ''}`}
          onClick={() => updateFilter('sharedInterestOnly', !localFilters.sharedInterestOnly)}
          title="Only members with shared interests"
        >
          💫 Connections
        </button>
      </div>

      <div className={styles.legendWrap}>
        <button
          className={styles.legendToggle}
          onClick={() => setLegendOpen(o => !o)}
        >
          {legendOpen ? 'Hide Legend ▲' : 'Show Legend ▼'}
        </button>
        {legendOpen && (
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Lines</div>
            <div className={styles.legendItem}>
              <span className={styles.lineSample} style={{ background: '#8b5cf6' }} />
              Connection
            </div>
            <div className={styles.legendItem}>
              <span className={styles.lineSample} style={{ background: '#22c55e' }} />
              Shared Group
            </div>
            <div className={styles.legendItem}>
              <span className={styles.lineSample} style={{ background: '#f59e0b' }} />
              Nearby
            </div>
            <div className={styles.legendItem}>
              <span className={styles.lineSample} style={{ background: '#00d9ff' }} />
              Shared Interest
            </div>
            <div className={styles.legendDivider} />
            <div className={styles.legendTitle}>Stars</div>
            <div className={styles.legendItem}>
              <span className={styles.starSample} style={{ boxShadow: '0 0 8px rgba(0,217,255,.6)' }} />
              Active now
            </div>
            <div className={styles.legendItem}>
              <span className={styles.starSample} style={{ opacity: 0.5 }} />
              Recently active
            </div>
            <div className={styles.legendItem}>
              <span className={styles.starSample} style={{ boxShadow: '0 0 8px rgba(99,102,241,.6)' }} />
              Seeking collaborators
            </div>
            <div className={styles.legendItem}>
              <span className={styles.starSample} style={{ background: 'rgba(148,163,184,.5)' }} />
              Idle
            </div>
          </div>
        )}
      </div>

      <div className={styles.edgeToggleGroup}>
        {(['CONNECTION', 'GROUP', 'LOCATION'] as EdgeType[]).map(type => (
          <button
            key={type}
            className={`${styles.edgeToggle} ${edgeFilters.includes(type) ? styles.edgeToggleOff : ''}`}
            onClick={() => toggleEdge(type)}
            title={edgeFilters.includes(type) ? `Show ${type.toLowerCase()} lines` : `Hide ${type.toLowerCase()} lines`}
          >
            {type === 'CONNECTION' ? '🤝' : type === 'GROUP' ? '👥' : '📍'}
            {edgeFilters.includes(type) && '✕'}
          </button>
        ))}
      </div>
    </div>
  )
}