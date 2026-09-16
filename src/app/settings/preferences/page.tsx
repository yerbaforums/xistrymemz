'use client'

import { useRouter } from 'next/navigation'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { NAV, DASHBOARD_SIDEBAR } from '@/lib/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from '../notifications/page.module.css'

const TOOL_GROUPS = [
  { label: 'Browse', items: NAV.explore },
  { label: 'Community', items: NAV.community },
  { label: 'Studio', items: DASHBOARD_SIDEBAR },
]

const ALL_ITEMS = TOOL_GROUPS.flatMap(g => g.items)

export default function PreferencesPage() {
  const router = useRouter()
  const { prefs, loaded, setPreference } = useUserPreferences()

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
        <h1>Tool Visibility</h1>
        <p>Choose which tools appear in your navigation. Hidden tools can be re-enabled here anytime.</p>
      </div>

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