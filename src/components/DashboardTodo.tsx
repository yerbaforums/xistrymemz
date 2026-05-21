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
      padding: 24,
      boxShadow: '4px 6px 16px rgba(0,0,0,0.1), -2px -2px 8px rgba(255,255,255,0.5) inset',
      transform: 'rotate(-0.3deg)',
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
        margin: '0 0 12px', fontSize: '1rem', color: '#5d4037',
        fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        📋 Quick Tasks
        {remaining > 0 && (
          <span style={{
            background: '#5d4037', color: '#fff', borderRadius: 10,
            padding: '1px 10px', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {remaining}
          </span>
        )}
      </h4>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a quick task..."
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e0d5a0',
            background: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', outline: 'none',
            color: '#333', fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: text.trim() ? '#5d4037' : '#ccc',
            color: '#fff', cursor: text.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.85rem', fontWeight: 600,
          }}
        >
          Add
        </button>
      </div>

      {todos.length === 0 ? (
        <p style={{ color: '#8d7b6a', fontSize: '0.8rem', margin: 0, fontStyle: 'italic' }}>
          No tasks yet. Add something above!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {todos.map(t => (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: t.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.06)',
                opacity: t.done ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                style={{ cursor: 'pointer', accentColor: '#5d4037', flexShrink: 0, width: 18, height: 18 }}
              />
              <span style={{
                flex: 1, wordBreak: 'break-word', minWidth: 0, lineHeight: 1.5,
                textDecoration: t.done ? 'line-through' : 'none',
                color: t.done ? '#8d7b6a' : '#4e342e', fontSize: '0.85rem',
              }}>
                {t.text}
              </span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                style={{
                  background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
                  fontSize: '0.7rem', color: '#8d7b6a', padding: '4px 8px',
                  borderRadius: 6, lineHeight: 1, flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
