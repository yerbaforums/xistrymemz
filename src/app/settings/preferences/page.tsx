'use client'

import { useRouter } from 'next/navigation'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useTheme } from '@/context/ThemeContext'
import { NAV, DASHBOARD_SIDEBAR } from '@/lib/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from '../notifications/page.module.css'

const TOOL_GROUPS = [
  { label: 'Browse', items: NAV.explore },
  { label: 'Community', items: NAV.community },
  { label: 'Studio', items: DASHBOARD_SIDEBAR },
]

const ALL_ITEMS = TOOL_GROUPS.flatMap(g => g.items)

const ACCENTS = [
  { id: 'cyan', label: 'Cyan', color: '#0891b2' },
  { id: 'purple', label: 'Purple', color: '#a855f7' },
  { id: 'green', label: 'Green', color: '#22c55e' },
  { id: 'orange', label: 'Orange', color: '#ea580c' },
  { id: 'pink', label: 'Pink', color: '#ec4899' },
  { id: 'blue', label: 'Blue', color: '#2563eb' },
] as const

export default function PreferencesPage() {
  const router = useRouter()
  const { prefs, loaded, setPreference } = useUserPreferences()
  const { mode, accent, setMode, setAccent } = useTheme()
  const density = prefs?.view?.density || 'comfortable'
  const autoplay = prefs?.view?.autoplay !== 'off'

  if (loaded && !prefs) {
    router.push('/auth/login')
    return null
  }

  const toggleTool = (href: string) => {
    const currentVisible = prefs?.tools?.[href] !== false
    setPreference({ tools: { [href]: !currentVisible } })
  }

  const resetAll = () => {
    const resetTools: Record<string, boolean> = {}
    for (const item of ALL_ITEMS) resetTools[item.href] = true
    setPreference({ tools: resetTools })
  }

  return (
    <div>
      <div className={styles.header}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Settings', href: '/settings' }, { label: 'Preferences' }]} />
        <h1>Customize</h1>
        <p>Appearance, feed behavior, and which tools appear in your navigation.</p>
      </div>

      <section className={styles.section}>
        <h2>Appearance</h2>
        <div className={styles.list}>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowIcon}>{mode === 'dark' ? '🌙' : '☀️'}</span>
              <div>
                <strong>Theme</strong>
                <p>Dark or light interface</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${mode === 'dark' ? styles.toggleOn : ''}`}
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              role="switch"
              aria-checked={mode === 'dark'}
              aria-label="Dark mode"
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowIcon}>🎨</span>
              <div>
                <strong>Accent color</strong>
                <p>Highlights, buttons, and links</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  title={a.label}
                  aria-label={`${a.label} accent`}
                  aria-pressed={accent === a.id}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                    background: a.color, border: accent === a.id ? '3px solid var(--text-primary)' : '2px solid transparent',
                    outline: 'none', padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Feed</h2>
        <div className={styles.list}>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowIcon}>📰</span>
              <div>
                <strong>Compact feed</strong>
                <p>Denser cards with smaller previews</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${density === 'compact' ? styles.toggleOn : ''}`}
              onClick={() => setPreference({ view: { density: density === 'compact' ? 'comfortable' : 'compact' } })}
              role="switch"
              aria-checked={density === 'compact'}
              aria-label="Compact feed"
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowIcon}>▶️</span>
              <div>
                <strong>Autoplay media</strong>
                <p>Auto-play muted previews in feeds</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${autoplay ? styles.toggleOn : ''}`}
              onClick={() => setPreference({ view: { autoplay: autoplay ? 'off' : 'on' } })}
              role="switch"
              aria-checked={autoplay}
              aria-label="Autoplay media"
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={resetAll} style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Reset to default (show all)
        </button>
      </div>

      {TOOL_GROUPS.map(group => (
        <section key={group.label} className={styles.section}>
          <h2>{group.label}</h2>
          <div className={styles.list}>
            {group.items.map(item => {
              const visible = prefs?.tools?.[item.href] !== false
              return (
                <label key={item.href} className={styles.row}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowIcon}>{item.icon}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.href}</p>
                    </div>
                  </div>
                  <button
                    className={`${styles.toggle} ${visible ? styles.toggleOn : ''}`}
                    onClick={() => toggleTool(item.href)}
                    role="switch"
                    aria-checked={visible}
                    aria-label={`${item.label} visibility`}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}