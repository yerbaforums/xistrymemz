'use client'

import { useState, useEffect } from 'react'
import { TIPS } from './tips'
import overviewStyles from './OverviewCards.module.css'

export default function TipCard() {
  const [tipIndex, setTipIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
    setTipIndex(dayIndex % TIPS.length)
  }, [])

  if (dismissed) return null

  return (
    <div className={overviewStyles.tipCard}>
      <span>{TIPS[tipIndex]}</span>
      <button
        onClick={() => setDismissed(true)}
        className={overviewStyles.tipDismiss}
        aria-label="Dismiss tip"
      >
        ✕
      </button>
    </div>
  )
}
