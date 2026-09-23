'use client'

import { useEffect, useMemo, useState } from 'react'
import { OVERVIEW_MODULES, OVERVIEW_PRESETS } from './modules'

interface ModuleState { visible?: boolean; order?: number }
type DashboardPrefs = { preset?: string; density?: 'comfortable' | 'compact'; modules?: Record<string, ModuleState> }

function applyToDom(modules: Record<string, ModuleState>, density: 'comfortable' | 'compact') {
  const root = document.getElementById('overview-root')
  if (!root) return
  root.setAttribute('data-density', density)
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-module]'))
  // Visibility first (closed modules fully hidden, reopenable from panel).
  for (const n of nodes) {
    const id = n.getAttribute('data-module') || ''
    const v = modules[id]?.visible
    n.style.display = v === false ? 'none' : ''
  }
  // Order: sort visible top-level modules by stored order.
  const ordered = nodes
    .filter(n => n.parentElement === root && n.style.display !== 'none')
    .sort((a, b) => {
      const ao = modules[a.getAttribute('data-module') || '']?.order ?? 999
      const bo = modules[b.getAttribute('data-module') || '']?.order ?? 999
      return ao - bo
    })
  for (const n of ordered) root.appendChild(n)
}

export default function OverviewCustomizer() {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('full')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [modules, setModules] = useState<Record<string, ModuleState>>({})
  const [loaded, setLoaded] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/preferences')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const dash: DashboardPrefs | undefined = d?.preferences?.dashboard
        if (dash?.preset && OVERVIEW_PRESETS[dash.preset]) setPreset(dash.preset)
        if (dash?.density) setDensity(dash.density)
        if (dash?.modules) setModules(dash.modules)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    applyToDom(modules, density)
  }, [modules, density, loaded])

  const persist = (next: { preset?: string; density?: 'comfortable' | 'compact'; modules?: Record<string, ModuleState> }) => {
    fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboard: next }),
    }).catch(() => {})
  }

  const orderedIds = useMemo(() => {
    return [...OVERVIEW_MODULES]
      .sort((a, b) => (modules[a.id]?.order ?? 999) - (modules[b.id]?.order ?? 999))
      .map(m => m.id)
  }, [modules])

  const setModule = (id: string, patch: ModuleState) => {
    setModules(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      persist({ preset, density, modules: next })
      return next
    })
  }

  const applyPreset = (key: string) => {
    const p = OVERVIEW_PRESETS[key]
    if (!p) return
    const next: Record<string, ModuleState> = {}
    OVERVIEW_MODULES.forEach((m, i) => {
      next[m.id] = { visible: p.visible.includes(m.id), order: i }
    })
    setPreset(key)
    setModules(next)
    persist({ preset: key, density, modules: next })
  }

  const move = (id: string, dir: -1 | 1) => {
    const ids = orderedIds
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    const swapped = [...ids]
    ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
    const next: Record<string, ModuleState> = { ...modules }
    swapped.forEach((mid, idx) => { next[mid] = { ...next[mid], order: idx } })
    setModules(next)
    persist({ preset, density, modules: next })
  }

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const ids = orderedIds.filter(id => id !== dragId)
    const ti = ids.indexOf(targetId)
    ids.splice(ti, 0, dragId)
    const next: Record<string, ModuleState> = { ...modules }
    ids.forEach((mid, idx) => { next[mid] = { ...next[mid], order: idx } })
    setModules(next)
    persist({ preset, density, modules: next })
    setDragId(null)
  }

  const toggleDensity = () => {
    const next = density === 'comfortable' ? 'compact' : 'comfortable'
    setDensity(next)
    persist({ preset, density: next, modules })
  }

  const reset = () => applyPreset('full')
  const hiddenCount = OVERVIEW_MODULES.filter(m => modules[m.id]?.visible === false).length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto 12px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.82rem' }}>
          🛠️ Customize view{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
        </button>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          {loaded ? `Preset: ${OVERVIEW_PRESETS[preset]?.label ?? preset} · ${density}` : 'Loading view prefs...'}
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 8, border: '1px solid var(--border-color)', borderRadius: 10, padding: 12, background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {Object.entries(OVERVIEW_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                title={p.desc}
                style={{
                  padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontSize: '0.78rem',
                  border: preset === key ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: preset === key ? 'var(--bg-primary)' : 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
            <button type="button" onClick={toggleDensity} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.78rem' }}>
              Density: {density}
            </button>
            <button type="button" onClick={reset} style={{ padding: '6px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent-primary)', background: 'none' }}>
              Reset
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {orderedIds.map(id => {
              const def = OVERVIEW_MODULES.find(m => m.id === id)!
              const visible = modules[id]?.visible !== false
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px dashed var(--border-color)', borderRadius: 8, opacity: visible ? 1 : 0.6, cursor: 'grab' }}
                >
                  <span style={{ cursor: 'grab' }} title="Drag to reorder">⠿</span>
                  <span>{def.icon}</span>
                  <span style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.82rem' }}>{def.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>{def.blurb}</span>
                  </span>
                  <button type="button" onClick={() => move(id, -1)} aria-label={`Move ${def.title} up`} style={{ cursor: 'pointer' }}>↑</button>
                  <button type="button" onClick={() => move(id, 1)} aria-label={`Move ${def.title} down`} style={{ cursor: 'pointer' }}>↓</button>
                  <button
                    type="button"
                    onClick={() => setModule(id, { visible: !visible })}
                    role="switch"
                    aria-checked={visible}
                    style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {visible ? 'Hide' : 'Reopen'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
