/** Escape CSV cell values: quote when they contain commas, quotes, or newlines. */
export function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Serialize rows (array of objects with the same keys) into a CSV string. */
export function toCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

/** Trigger a client-side download of text content. */
export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Download an array of row objects as a CSV file. */
export function downloadCSV(filename: string, headers: string[], rows: unknown[][]) {
  downloadText(filename, toCSV(headers, rows))
}