'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import styles from './LinkItemModal.module.css'
import { EmptyState } from '@/components/EmptyState'

interface SearchResult {
  id: string
  title: string
  url: string
  type: string
}

interface LinkItemModalProps {
  isOpen: boolean
  onClose: () => void
  sourceType: string
  sourceId: string
  onLinked: () => void
}

const ENTITY_TYPES = [
  { value: 'PLAN', label: 'Plan', icon: '📋' },
  { value: 'PRODUCT', label: 'Product', icon: '🛒' },
  { value: 'EVENT', label: 'Event', icon: '📅' },
  { value: 'REQUEST', label: 'Request', icon: '🙋' },
  { value: 'SERVICE', label: 'Service', icon: '🔧' },
  { value: 'GROUP', label: 'Group', icon: '👥' },
  { value: 'POST', label: 'Post', icon: '📝' },
  { value: 'SCHOOLCONTENT', label: 'School Content', icon: '📚' },
  { value: 'SHOP', label: 'Shop', icon: '🏪' },
  { value: 'SCHOOL', label: 'School', icon: '🏫' },
]

const RELATION_TYPES = [
  { value: 'REFERENCES', label: 'References', desc: 'Mentions or cites this item' },
  { value: 'CONTAINS', label: 'Contains', desc: 'Includes this item as part of it' },
  { value: 'RELATES_TO', label: 'Relates To', desc: 'Related or associated with' },
  { value: 'PROMOTES', label: 'Promotes', desc: 'Promotes or recommends this' },
]

export default function LinkItemModal({
  isOpen,
  onClose,
  sourceType,
  sourceId,
  onLinked,
}: LinkItemModalProps) {
  const [targetType, setTargetType] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [relationType, setRelationType] = useState('REFERENCES')
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback(async (q: string, type: string) => {
    if (q.length < 2 || !type) {
      setResults([])
      return
    }

    setSearching(true)
    try {
      const res = await fetch(`/api/search/entities?type=${type}&q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data?.data?.items || data?.items || [])
      }
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      handleSearch(value, targetType)
    }, 300)
  }

  const handleTypeChange = (type: string) => {
    setTargetType(type)
    setSelected(null)
    setResults([])
    setQuery('')
    if (query.length >= 2) {
      handleSearch(query, type)
    }
  }

  const handleLink = async () => {
    if (!selected) return
    setLinking(true)
    setError(null)

    try {
      const res = await fetch('/api/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          targetType: selected.type,
          targetId: selected.id,
          relationType,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onLinked()
          handleReset()
        }, 1000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create link')
      }
    } catch {
      setError('Failed to create link')
    } finally {
      setLinking(false)
    }
  }

  const handleReset = () => {
    setTargetType('')
    setQuery('')
    setResults([])
    setSelected(null)
    setRelationType('REFERENCES')
    setError(null)
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleReset}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Link Item</h2>
          <button className={styles.closeBtn} onClick={handleReset}>✕</button>
        </div>

        {success ? (
          <div className={styles.success}>
            <span className={styles.successIcon}>✓</span>
            <span>Item linked successfully!</span>
          </div>
        ) : (
          <>
            <div className={styles.step}>
              <label className={styles.label}>1. Select target type</label>
              <div className={styles.typeGrid}>
                {ENTITY_TYPES.filter(t => t.value !== sourceType).map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleTypeChange(t.value)}
                    className={`${styles.typeBtn} ${targetType === t.value ? styles.typeBtnActive : ''}`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {targetType && (
              <div className={styles.step}>
                <label className={styles.label}>2. Search for item</label>
                <input
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder={`Search ${ENTITY_TYPES.find(t => t.value === targetType)?.label || ''}...`}
                  className={styles.searchInput}
                  autoFocus
                />
                {searching && <div className={styles.searching}>Searching...</div>}
                {results.length > 0 && (
                  <div className={styles.results}>
                    {results.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className={`${styles.resultItem} ${selected?.id === r.id ? styles.resultSelected : ''}`}
                      >
                        <span className={styles.resultTitle}>{r.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {query.length >= 2 && !searching && results.length === 0 && (
                  <EmptyState icon="🔗" title="No items found" description="Try a different search term." />
                )}
              </div>
            )}

            {selected && (
              <div className={styles.step}>
                <label className={styles.label}>3. Choose relation type</label>
                <div className={styles.relationGrid}>
                  {RELATION_TYPES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRelationType(r.value)}
                      className={`${styles.relationBtn} ${relationType === r.value ? styles.relationBtnActive : ''}`}
                    >
                      <span className={styles.relationLabel}>{r.label}</span>
                      <span className={styles.relationDesc}>{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            {selected && (
              <div className={styles.footer}>
                <div className={styles.preview}>
                  Linking <strong>{ENTITY_TYPES.find(t => t.value === selected.type)?.icon} {selected.title}</strong>
                  {' '}as <em>{RELATION_TYPES.find(r => r.value === relationType)?.label}</em>
                </div>
                <div className={styles.footerActions}>
                  <button onClick={handleReset} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button
                    onClick={handleLink}
                    disabled={linking}
                    className={styles.linkBtn}
                  >
                    {linking ? 'Linking...' : '🔗 Create Link'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
