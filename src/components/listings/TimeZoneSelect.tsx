'use client'

import { isValidTimeZone } from '@/lib/timezone'

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Phoenix',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Kyiv',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Manila',
  'Australia/Perth',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Pacific/Auckland',
  'Pacific/Honolulu',
]

interface TimeZoneSelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function TimeZoneSelect({ value, onChange, label = 'Timezone' }: TimeZoneSelectProps) {
  const gmt = (tz: string) => {
    if (tz === 'UTC') return 'UTC'
    try {
      const now = new Date()
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).formatToParts(now)
      const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0)
      const instant = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'))
      const offMin = Math.round((instant - now.getTime()) / 60000)
      const sign = offMin < 0 ? '-' : '+'
      const abs = Math.abs(offMin)
      return `GMT${sign}${Math.floor(abs / 60)}${abs % 60 ? ':' + String(abs % 60).padStart(2, '0') : ''}`
    } catch {
      return tz
    }
  }

  const zoneNames = isValidTimeZone(value) && !COMMON_TIMEZONES.includes(value) ? [...COMMON_TIMEZONES, value] : COMMON_TIMEZONES

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      <span>{label}</span>
      <input
        type="text"
        list="xistry-timezones"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. America/New_York (or use your browser)"
        style={{ padding: '9px 12px', border: '1px solid var(--border-color, rgba(255,255,255,0.12))', borderRadius: 8, background: 'var(--bg-input, rgba(255,255,255,0.04))', color: 'var(--text-primary, #fff)', fontSize: '0.9rem', width: '100%', textTransform: 'none', fontWeight: 400 }}
      />
      <datalist id="xistry-timezones">
        {zoneNames.map(tz => (
          <option key={tz} value={tz}>{tz} ({gmt(tz)})</option>
        ))}
      </datalist>
      <span style={{ textTransform: 'none', fontWeight: 400 }}>Anchors your booking availability and busy-time checks to your local time.</span>
    </label>
  )
}