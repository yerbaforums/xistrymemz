/// <reference types="jest" />
import * as fs from 'fs'
import * as path from 'path'

// Live-server gate: __tests__/api/** suites need a running dev server
// (see jest.globalSetup.js). Without one they skip instead of failing.
let serverUp = false
try {
  const raw = fs.readFileSync(path.join(__dirname, '.server-status.json'), 'utf8')
  serverUp = (JSON.parse(raw) as { serverUp?: boolean }).serverUp === true
} catch {
  serverUp = false
}

export const describeIfServer: jest.Describe = serverUp ? describe : describe.skip
