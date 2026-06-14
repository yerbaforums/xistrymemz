export interface CalendarEventParams {
  title: string
  description?: string
  location?: string
  meetingLink?: string
  startTime: Date | string
  endTime: Date | string
}

function pad(n: number): string { return String(n).padStart(2, '0') }

function dateToIcs(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateIcsContent(params: CalendarEventParams): string {
  const now = dateToIcs(new Date())
  const start = dateToIcs(params.startTime)
  const end = dateToIcs(params.endTime)
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@xistrymemz`

  let desc = params.description || ''
  if (params.meetingLink) {
    desc = desc ? `${desc}\n\nMeeting Link: ${params.meetingLink}` : `Meeting Link: ${params.meetingLink}`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//XistrYmemZ//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeIcs(params.title)}`,
    desc ? `DESCRIPTION:${escapeIcs(desc)}` : null,
    params.location ? `LOCATION:${escapeIcs(params.location)}` : null,
    params.meetingLink ? `URL:${escapeIcs(params.meetingLink)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n') + '\r\n'
}

export function downloadIcs(params: CalendarEventParams) {
  const content = generateIcsContent(params)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${params.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function googleCalendarUrl(params: CalendarEventParams): string {
  const start = typeof params.startTime === 'string' ? new Date(params.startTime) : params.startTime
  const end = typeof params.endTime === 'string' ? new Date(params.endTime) : params.endTime
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '')
  let details = params.description || ''
  if (params.meetingLink) details = details ? `${details}\n\n${params.meetingLink}` : params.meetingLink
  const url = new URL('https://www.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', params.title)
  if (details) url.searchParams.set('details', details)
  if (params.location) url.searchParams.set('location', params.location)
  url.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`)
  return url.toString()
}

export function outlookCalendarUrl(params: CalendarEventParams): string {
  const start = typeof params.startTime === 'string' ? new Date(params.startTime) : params.startTime
  const end = typeof params.endTime === 'string' ? new Date(params.endTime) : params.endTime
  const fmt = (d: Date) => d.toISOString()
  let body = params.description || ''
  if (params.meetingLink) body = body ? `${body}\n\n${params.meetingLink}` : params.meetingLink
  const url = new URL('https://outlook.office.com/calendar/0/deeplink/compose')
  url.searchParams.set('subject', params.title)
  if (body) url.searchParams.set('body', body)
  if (params.location) url.searchParams.set('location', params.location)
  url.searchParams.set('startdt', fmt(start))
  url.searchParams.set('enddt', fmt(end))
  return url.toString()
}
