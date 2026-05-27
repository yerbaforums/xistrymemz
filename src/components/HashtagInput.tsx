'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './HashtagInput.module.css'

interface HashtagSuggestion {
  tag: string
  postCount: number
}

interface HashtagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  disabled?: boolean
}

export default function HashtagInput({
  value,
  onChange,
  placeholder = 'Add hashtags...',
  maxTags = 10,
  disabled = false,
}: HashtagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const res = await fetch(`/api/hashtags?search=${encodeURIComponent(query)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        const existing = new Set(value.map(t => t.toLowerCase()))
        const filtered = (data.hashtags || []).filter((h: HashtagSuggestion) => !existing.has(h.tag))
        setSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
      }
    } catch {
      setSuggestions([])
    }
  }, [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(input.trim()), 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input, fetchSuggestions])

  const addTag = useCallback((tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50)
    if (!clean || value.includes(clean) || value.length >= maxTags) return
    onChange([...value, clean])
    setInput('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [value, onChange, maxTags])

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag))
  }, [value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter' && input.trim()) {
        e.preventDefault()
        addTag(input.trim())
      }
      if (e.key === ',' || e.key === ' ') {
        const trimmed = input.replace(/[, ]/g, '').trim()
        if (trimmed) {
          e.preventDefault()
          addTag(trimmed)
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          addTag(suggestions[selectedIndex].tag)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tagList}>
        {value.map(tag => (
          <span key={tag} className={styles.tag}>
            <span className={styles.tagHash}>#</span>
            {tag}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeTag(tag)}
              disabled={disabled}
              aria-label={`Remove #${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <div className={styles.inputWrapper}>
            <span className={styles.hashPrefix}>#</span>
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              value={input}
              onChange={e => { setInput(e.target.value); setSelectedIndex(-1) }}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              className={`${styles.suggestion} ${i === selectedIndex ? styles.suggestionActive : ''}`}
              onMouseDown={() => addTag(s.tag)}
            >
              <span className={styles.suggestionTag}>#{s.tag}</span>
              <span className={styles.suggestionCount}>{s.postCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
