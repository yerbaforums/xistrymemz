'use client'

import { useState, useEffect, useRef } from 'react'

interface TodoItem {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = 'dashboard_todos'

function loadTodos(): TodoItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTodos(todos: TodoItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch {}
}

export default function DashboardTodo() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTodos(loadTodos())
  }, [])

  useEffect(() => {
    if (todos.length) saveTodos(todos)
  }, [todos])

  const add = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const newItem: TodoItem = { id: Date.now().toString(), text: trimmed, done: false }
    setTodos(prev => [newItem, ...prev])
    setText('')
    inputRef.current?.focus()
  }

  const toggle = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const remove = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') add()
  }

  const remaining = todos.filter(t => !t.done).length

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)',
      borderRadius: 12,
      padding: 20,
      boxShadow: '4px 6px 16px rgba(0,0,0,0.1), -2px -2px 8px rgba(255,255,255,0.5) inset',
      transform: 'rotate(-0.5deg)',
      position: 'relative',
      marginTop: 12,
    }}>
      <div style={{
        position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
        width: 40, height: 12,
        background: 'rgba(0,0,0,0.06)',
        borderRadius: '0 0 4px 4px',
      }} />

      <h4 style={{
        margin: '0 0 12px', fontSize: '0.9rem', color: '#5d4037',
        fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        📝 Quick Tasks
        {remaining > 0 && (
          <span style={{
            background: '#5d4037', color: '#fff', borderRadius: 10,
            padding: '1px 8px', fontSize: '0.7rem', fontWeight: 600,
          }}>
            {remaining}
          </span>
        )}
      </h4>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a quick task..."
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e0d5a0',
            background: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', outline: 'none',
            color: '#333', fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: text.trim() ? '#5d4037' : '#ccc',
            color: '#fff', cursor: text.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem', fontWeight: 600,
          }}
        >
          Add
        </button>
      </div>

      {todos.length === 0 ? (
        <p style={{ color: '#8d7b6a', fontSize: '0.78rem', margin: 0, fontStyle: 'italic' }}>
          No tasks yet. Add something above!
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {todos.map(t => (
            <li
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6,
                background: t.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s',
                textDecoration: t.done ? 'line-through' : 'none',
                color: t.done ? '#8d7b6a' : '#4e342e',
                fontSize: '0.82rem',
              }}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                style={{ cursor: 'pointer', accentColor: '#5d4037' }}
              />
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{t.text}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', color: '#bcaaa4', padding: 2, lineHeight: 1,
                }}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
