'use client'

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { getSelectionAfterAt } from '@/lib/mentions'
import { useToast } from '@/context/ToastContext'

interface UserResult {
  id: string
  name: string | null
  image: string | null
  username: string | null
}

interface HashtagResult {
  tag: string
  postCount: number
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

const HASHES_REGEX = /#([\w]{1,30})$/g
const MENTION_REGEX = /@(\w{2,50})$/g

const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(function MentionInput({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  maxLength = 2000,
  className = ''
}: MentionInputProps, ref) {
  const [suggestions, setSuggestions] = useState<(UserResult | HashtagResult)[]>([])
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionType, setSuggestionType] = useState<'user' | 'hashtag'>('user')
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

  const fetchHashtags = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const res = await fetch(`/api/hashtags/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.hashtags || [])
        setShowSuggestions((data.hashtags?.length || 0) > 0)
        setActiveIndex(0)
      }
    } catch {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      const el = textareaRef.current
      if (el && mentionStart !== null) {
        const pos = el.selectionStart
        const textBefore = value.slice(0, pos)
        const char = textBefore[mentionStart - 2]
        const query = textBefore.slice(mentionStart - 1, pos)
        if (query.includes(' ')) {
          setShowSuggestions(false)
        }
      }
    }
  }, [value, mentionStart, suggestions.length, showSuggestions])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const pos = e.target.selectionStart
    const textBefore = newValue.slice(0, pos)

    const hashMatch = textBefore.match(HASHES_REGEX)
    if (hashMatch) {
      setSuggestionType('hashtag')
      setMentionStart(pos - hashMatch[0].length + 1)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchHashtags(hashMatch[1]), 200)
      return
    }

    const result = getSelectionAfterAt(e.target)
    if (result) {
      setSuggestionType('user')
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
    const username = user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'user'
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

  const insertHashtag = (tag: string) => {
    const el = textareaRef.current
    if (!el || mentionStart === null) return

    const pos = el.selectionStart
    const textBefore = value.slice(0, pos)
    const hashIdx = textBefore.lastIndexOf('#', mentionStart - 1)

    if (hashIdx === -1) return

    const beforeHash = value.slice(0, hashIdx)
    const afterHash = value.slice(pos)
    const newValue = `${beforeHash}#${tag} ${afterHash}`

    onChange(newValue)
    setShowSuggestions(false)
    setMentionStart(null)

    requestAnimationFrame(() => {
      el.focus()
      const cursorPos = hashIdx + tag.length + 2
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
        if (suggestionType === 'hashtag') {
          insertHashtag((suggestions[activeIndex] as HashtagResult).tag)
        } else {
          insertMention(suggestions[activeIndex] as UserResult)
        }
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
          {suggestionType === 'user' && suggestions.map((user, i) => (
            <button
              key={(user as UserResult).id}
              type="button"
              onClick={() => insertMention(user as UserResult)}
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
              {(user as UserResult).image ? (
                <img src={(user as UserResult).image!} alt="" width={24} height={24} style={{ borderRadius: '50%' }} />
              ) : (
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                  {(user as UserResult).name?.[0] || 'U'}
                </span>
              )}
              <span>{(user as UserResult).name || 'Unknown'}</span>
            </button>
          ))}
          {suggestionType === 'hashtag' && suggestions.map((h, i) => (
            <button
              key={(h as HashtagResult).tag}
              type="button"
              onClick={() => insertHashtag((h as HashtagResult).tag)}
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
              <span style={{ fontSize: '1rem' }}>#</span>
              <span>{(h as HashtagResult).tag}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                {(h as HashtagResult).postCount}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default MentionInput
