const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseRRuleString(rule: string): Record<string, string> {
  const opts: Record<string, string> = {}
  if (!rule || typeof rule !== 'string') return opts
  const cleaned = rule.replace(/^RRULE:/i, '').trim()
  if (!cleaned) return opts
  const parts = cleaned.split(';')
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    opts[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).toUpperCase()
  }
  return opts
}

export function parseRRule(rule: string, startDate: Date, count?: number): Date[] {
  try {
    const opts = parseRRuleString(rule)
    const freq = opts.FREQ
    if (!freq) return [new Date(startDate)]

    const interval = Math.max(1, parseInt(opts.INTERVAL || '1', 10))
    const maxCount = count || (opts.COUNT ? parseInt(opts.COUNT, 10) : null)
    const until = opts.UNTIL ? new Date(opts.UNTIL.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')) : null
    const byDay = opts.BYDAY ? opts.BYDAY.split(',') : []
    const byMonthDay = opts.BYMONTHDAY ? opts.BYMONTHDAY.split(',').map(Number) : []
    const byMonth = opts.BYMONTH ? opts.BYMONTH.split(',').map(Number) : []

    const dates: Date[] = []
    const maxIterations = 520
    let iterations = 0

    function inRange(d: Date): boolean {
      if (until && d > until) return false
      if (maxCount && dates.length >= maxCount) return false
      return true
    }

    if (freq === 'DAILY') {
      let current = new Date(startDate)
      while (inRange(current) && iterations < maxIterations) {
        dates.push(new Date(current))
        current = addDays(current, interval)
        iterations++
      }
    } else if (freq === 'WEEKLY') {
      if (byDay.length > 0) {
        const dayNumbers = byDay.map(d => DAY_MAP[d]).filter(n => n !== undefined)
        let weekStart = startOfWeek(startDate)
        while (inRange(weekStart) && iterations < maxIterations) {
          for (const dayNum of dayNumbers) {
            const candidate = addDays(weekStart, dayNum)
            if (candidate >= startDate && inRange(candidate)) {
              dates.push(new Date(candidate))
            }
            iterations++
            if (maxCount && dates.length >= maxCount) break
          }
          weekStart = addDays(weekStart, 7 * interval)
          iterations++
        }
      } else {
        let current = new Date(startDate)
        while (inRange(current) && iterations < maxIterations) {
          dates.push(new Date(current))
          current = addDays(current, 7 * interval)
          iterations++
        }
      }
    } else if (freq === 'MONTHLY') {
      let current = new Date(startDate)
      while (inRange(current) && iterations < maxIterations) {
        if (byMonthDay.length > 0) {
          const baseMonth = new Date(current.getFullYear(), current.getMonth(), 1)
          for (const md of byMonthDay) {
            const day = Math.abs(md)
            const candidate = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), day)
            if (candidate >= startDate && inRange(candidate)) {
              dates.push(new Date(candidate))
            }
            iterations++
            if (maxCount && dates.length >= maxCount) break
          }
        } else if (byMonth.length > 0) {
          for (const m of byMonth) {
            const candidate = new Date(current.getFullYear(), m - 1, current.getDate())
            if (candidate >= startDate && inRange(candidate)) {
              dates.push(new Date(candidate))
            }
            iterations++
            if (maxCount && dates.length >= maxCount) break
          }
        } else {
          dates.push(new Date(current))
        }
        current = addMonths(current, interval)
        iterations++
      }
    } else if (freq === 'YEARLY') {
      let current = new Date(startDate)
      while (inRange(current) && iterations < maxIterations) {
        if (byMonth.length > 0 && byMonthDay.length > 0) {
          for (const m of byMonth) {
            for (const md of byMonthDay) {
              const candidate = new Date(current.getFullYear(), m - 1, Math.abs(md))
              if (candidate >= startDate && inRange(candidate)) {
                dates.push(new Date(candidate))
              }
              iterations++
              if (maxCount && dates.length >= maxCount) break
            }
            if (maxCount && dates.length >= maxCount) break
          }
        } else {
          dates.push(new Date(current))
        }
        current = addYears(current, interval)
        iterations++
      }
    }

    return dates.length > 0 ? dates : [new Date(startDate)]
  } catch {
    return [new Date(startDate)]
  }
}

export function serializeRRule(opts: {
  freq: string
  interval?: number
  byDay?: string[]
  byMonthDay?: number
  byMonth?: number
  until?: Date
  count?: number
}): string {
  const parts: string[] = [`FREQ=${opts.freq.toUpperCase()}`]
  if (opts.interval && opts.interval > 1) parts.push(`INTERVAL=${opts.interval}`)
  if (opts.byDay && opts.byDay.length > 0) parts.push(`BYDAY=${opts.byDay.join(',')}`)
  if (opts.byMonthDay) parts.push(`BYMONTHDAY=${opts.byMonthDay}`)
  if (opts.byMonth) parts.push(`BYMONTH=${opts.byMonth}`)
  if (opts.until) parts.push(`UNTIL=${formatRRuleDate(opts.until)}`)
  if (opts.count) parts.push(`COUNT=${opts.count}`)
  return parts.join(';')
}

function formatRRuleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function getRecurrenceLabel(rule: string, _startDate: Date): string {
  try {
    const opts = parseRRuleString(rule)
    const freq = opts.FREQ
    if (!freq) return 'Repeats'

    const interval = parseInt(opts.INTERVAL || '1', 10)
    const byDay = opts.BYDAY ? opts.BYDAY.split(',') : []

    const dayName = (d: string) => {
      const names: Record<string, string> = { SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday' }
      return names[d] || d
    }

    const intervalWord = (n: number, unit: string) => {
      if (n === 1) return unit
      return `Every ${n} ${unit}s`
    }

    if (freq === 'DAILY') {
      return intervalWord(interval, 'day').replace(/^Every 1 /, 'Every ')
    }

    if (freq === 'WEEKLY') {
      if (byDay.length > 0) {
        const names = byDay.map(d => dayName(d))
        if (names.length === 1) {
          return interval === 1 ? `Every ${names[0]}` : `Every ${interval} weeks on ${names[0]}`
        }
        return interval === 1
          ? `Every ${names.join(', ').replace(/, ([^,]+)$/, ' and $1')}`
          : `Every ${interval} weeks on ${names.join(', ').replace(/, ([^,]+)$/, ' and $1')}`
      }
      return intervalWord(interval, 'week')
    }

    if (freq === 'MONTHLY') {
      if (opts.BYMONTHDAY) {
        const day = parseInt(opts.BYMONTHDAY, 10)
        return intervalWord(interval, 'month') + ` on the ${day}${ordinalSuffix(day)}`
      }
      return intervalWord(interval, 'month')
    }

    if (freq === 'YEARLY') {
      return intervalWord(interval, 'year')
    }

    return 'Repeats'
  } catch {
    return 'Repeats'
  }
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
