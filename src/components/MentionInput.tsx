'use client'

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { getSelectionAfterAt } from '@/lib/mentions'
import { useToast } from '@/context/ToastContext'

interface UserResult {
  id: string
  name: string | null
  image: string | null
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  className?: string
}

export interface MentionInputHandle {
  insertAtCursor: (text: string) => void
}

const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(function MentionInput({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  maxLength = 2000,
  className = ''
}: MentionInputProps, ref) {
  const [suggestions, setSuggestions] = useState<UserResult[]>([])
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { error: toastError } = useToast()

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const newValue = value.slice(0, start) + text + value.slice(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + text.length
        el.setSelectionRange(pos, pos)
      })
    }
  }))

  const fetchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.users || [])
        setShowSuggestions(data.users?.length > 0)
        setActiveIndex(0)
      }
    } catch {
      setSuggestions([])
      setShowSuggestions(false)
      toastError('Failed to search users')
    }
  }, [])

  useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      const el = textareaRef.current
      if (el && mentionStart !== null) {
        const pos = el.selectionStart
        const textBefore = value.slice(0, pos)
        const atIdx = textBefore.lastIndexOf('@', mentionStart - 1)
        const query = textBefore.slice(atIdx + 1, pos)
        if (query.includes(' ')) {
          setShowSuggestions(false)
        }
      }
    }
  }, [value, mentionStart, suggestions.length, showSuggestions])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const result = getSelectionAfterAt(e.target)
    if (result) {
      setMentionStart(result.start)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchUsers(result.query), 200)
    } else {
      setShowSuggestions(false)
      setMentionStart(null)
    }
  }

  const insertMention = (user: UserResult) => {
    const el = textareaRef.current
    if (!el || mentionStart === null) return

    const pos = el.selectionStart
    const textBefore = value.slice(0, pos)
    const atIdx = textBefore.lastIndexOf('@', mentionStart - 1)

    if (atIdx === -1) return

    const beforeAt = value.slice(0, atIdx)
    const afterAt = value.slice(pos)
    const username = user.name?.toLowerCase().replace(/\s+/g, '') || 'user'
    const newValue = `${beforeAt}@${username} ${afterAt}`

    onChange(newValue)
    setShowSuggestions(false)
    setMentionStart(null)

    requestAnimationFrame(() => {
      el.focus()
      const cursorPos = atIdx + username.length + 2
      el.setSelectionRange(cursorPos, cursorPos)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault()
        insertMention(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: i === activeIndex ? 'var(--bg-hover)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)'
              }}
            >
              {user.image ? (
                <img src={user.image} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />
              ) : (
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                  {user.name?.[0] || 'U'}
                </span>
              )}
              <span>{user.name || 'Unknown'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default MentionInput
