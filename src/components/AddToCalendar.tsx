'use client'

import { useState, useRef, useEffect } from 'react'
import { downloadIcs, googleCalendarUrl, outlookCalendarUrl, type CalendarEventParams } from '@/lib/calendar-events'
import styles from './AddToCalendar.module.css'

interface AddToCalendarProps {
  params: CalendarEventParams
  label?: string
  variant?: 'button' | 'link'
}

export default function AddToCalendar({ params, label = 'Add to Calendar', variant = 'button' }: AddToCalendarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.wrapper} ref={ref}>
      {variant === 'button' ? (
        <button onClick={() => setOpen(!open)} className={styles.btn}>
          📅 {label}
        </button>
      ) : (
        <span onClick={() => setOpen(!open)} className={styles.link}>
          📅 {label}
        </span>
      )}
      {open && (
        <div className={styles.dropdown}>
          <a href={googleCalendarUrl(params)} target="_blank" rel="noopener noreferrer" className={styles.option}>
            <span className={styles.optionIcon}>🔵</span> Google Calendar
          </a>
          <a href={outlookCalendarUrl(params)} target="_blank" rel="noopener noreferrer" className={styles.option}>
            <span className={styles.optionIcon}>🔷</span> Outlook
          </a>
          <button onClick={() => { downloadIcs(params); setOpen(false) }} className={styles.option}>
            <span className={styles.optionIcon}>📥</span> Download .ics
          </button>
        </div>
      )}
    </div>
  )
}
