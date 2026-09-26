// Probes TEST_BASE_URL before the run so live-server integration suites
// (__tests__/api/**) can skip instead of failing when no dev server is up.
// Writes __tests__/.server-status.json (git-ignored).
module.exports = async () => {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3000'
  let serverUp = false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(base, { signal: ctrl.signal, redirect: 'manual' })
    clearTimeout(t)
    serverUp = !!res
  } catch {
    serverUp = false
  }
  const fs = require('fs')
  const path = require('path')
  fs.writeFileSync(
    path.join(__dirname, '__tests__', '.server-status.json'),
    JSON.stringify({ serverUp, base, at: new Date().toISOString() })
  )
  if (!serverUp) {
    console.log(`\n[jest] no dev server at ${base} — __tests__/api/** will SKIP (start \`npm run dev\` or set TEST_BASE_URL to run them)\n`)
  }
}
