export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function browserTimeZone(): string {
  if (typeof window === 'undefined') return 'UTC'
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function formatToPartsInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
}

function partsToValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const part = parts.find(p => p.type === type)
  return part ? Number(part.value) : 0
}

// Build the absolute UTC instant whose wall-clock in `timeZone` is `dateStr` at `timeStr`.
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number)
  if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return new Date(NaN)

  const naiveMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  const probe = new Date(naiveMs)
  const parts = formatToPartsInZone(probe, timeZone)
  const guess = Date.UTC(
    partsToValue(parts, 'year'),
    partsToValue(parts, 'month') - 1,
    partsToValue(parts, 'day'),
    partsToValue(parts, 'hour') % 24,
    partsToValue(parts, 'minute'),
    partsToValue(parts, 'second'),
  )
  const offsetMs = guess - naiveMs
  return new Date(naiveMs - offsetMs)
}

// UTC boundaries of the calendar day `dateStr` as seen in `timeZone`.
export function zonedDayBounds(dateStr: string, timeZone: string): { start: Date; end: Date } {
  const start = zonedTimeToUtc(dateStr, '00:00', timeZone)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { start, end }
}

// The local calendar date (YYYY-MM-DD) in `timeZone` for a given instant.
export function zonedDateStr(date: Date, timeZone: string): string {
  const parts = formatToPartsInZone(date, timeZone)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${partsToValue(parts, 'year')}-${pad(partsToValue(parts, 'month'))}-${pad(partsToValue(parts, 'day'))}`
}

// Day of week (0=Sunday) of the calendar date `dateStr` as seen in `timeZone`.
export function zonedDayOfWeek(dateStr: string, timeZone: string): number {
  return zonedDayBounds(dateStr, timeZone).start.getUTCDay()
}

// Minutes since midnight in `timeZone` for a given instant.
export function zonedMinutesSinceMidnight(date: Date, timeZone: string): number {
  const parts = formatToPartsInZone(date, timeZone)
  return partsToValue(parts, 'hour') % 24 * 60 + partsToValue(parts, 'minute')
}

// Short human label like "GMT-4" or "UTC".
export function tzShortLabel(timeZone: string): string {
  if (!isValidTimeZone(timeZone)) return 'your timezone'
  try {
    const now = new Date()
    const parts = formatToPartsInZone(now, timeZone)
    let totalUtc = Date.UTC(
      partsToValue(parts, 'year'),
      partsToValue(parts, 'month') - 1,
      partsToValue(parts, 'day'),
      partsToValue(parts, 'hour') % 24,
      partsToValue(parts, 'minute'),
      partsToValue(parts, 'second'),
    )
    let offsetMin = Math.round((totalUtc - now.getTime()) / 60000)
    let sign = '+'
    if (offsetMin < 0) { sign = '-'; offsetMin = -offsetMin }
    const h = Math.floor(offsetMin / 60)
    const m = offsetMin % 60
    if (h === 0 && m === 0) return 'UTC'
    return `GMT${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
  } catch {
    return timeZone
  }
}