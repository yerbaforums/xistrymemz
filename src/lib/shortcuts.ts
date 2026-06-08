import { DASHBOARD_SIDEBAR_PRIMARY } from './navigation'

const SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export function dashboardShortcuts(navigate: (href: string) => void) {
  const handleKey = (e: KeyboardEvent) => {
    if (!e.altKey) return
    const idx = SHORTCUT_KEYS.indexOf(e.key)
    if (idx >= 0 && idx < DASHBOARD_SIDEBAR_PRIMARY.length) {
      e.preventDefault()
      navigate(DASHBOARD_SIDEBAR_PRIMARY[idx].href)
    }
    if (e.key === 'b' && e.altKey) {
      e.preventDefault()
      navigate('/boards')
    }
    if (e.key === 'p' && e.altKey) {
      e.preventDefault()
      navigate('/dashboard/passport')
    }
    if (e.key === 'd' && e.altKey) {
      e.preventDefault()
      navigate('/discover')
    }
    if (e.key === 'f' && e.altKey) {
      e.preventDefault()
      navigate('/dashboard/feed')
    }
    if (e.key === 'n' && e.altKey) {
      e.preventDefault()
      navigate('/dashboard/overview')
    }
  }

  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}
