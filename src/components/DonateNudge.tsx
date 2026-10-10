'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './DonateNudge.module.css'

const VIEWS_KEY = 'xistrymemz_donate_nudge_views'
const SNOOZE_KEY = 'xistrymemz_donate_nudge_snooze'
const NEVER_KEY = 'xistrymemz_donate_nudge_never'
// Shown once the member is clearly getting value, then at most monthly.
// Everything lives in localStorage: no account, no tracking, no schema.
const VIEW_THRESHOLD = 12
const SNOOZE_MS = 30 * 24 * 3600 * 1000

function readInt(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0
  } catch {
    return 0
  }
}

export default function DonateNudge() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(NEVER_KEY)) return
      const snoozed = readInt(SNOOZE_KEY)
      if (snoozed && Date.now() - snoozed < SNOOZE_MS) return
      const views = readInt(VIEWS_KEY) + 1
      localStorage.setItem(VIEWS_KEY, String(views))
      if (views >= VIEW_THRESHOLD) {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()))
        localStorage.setItem(VIEWS_KEY, '0')
        setVisible(true)
      }
    } catch {
      // Private mode etc: stay silent rather than nagging brokenly.
    }
  }, [])

  if (!visible) return null

  const dismiss = (never: boolean) => {
    try {
      if (never) localStorage.setItem(NEVER_KEY, 'true')
      else localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    } catch {}
    setVisible(false)
  }

  return (
    <div className={styles.nudge} role="status">
      <span className={styles.text}>
        💎 Enjoying XistrYmemZ? It&apos;s <strong>100% user-funded</strong> — no fees, no ads.
      </span>
      <span className={styles.actions}>
        <Link href="/donate" className={styles.donateBtn}>Donate</Link>
        <button type="button" onClick={() => dismiss(false)} className={styles.laterBtn}>Later</button>
        <button type="button" onClick={() => dismiss(true)} className={styles.neverBtn} title="Don't show again">✕</button>
      </span>
    </div>
  )
}
