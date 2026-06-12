import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import type { NextRequest } from 'next/server'

const DEEPL_API_BASE = process.env.DEEPL_API_KEY?.startsWith('fake') || process.env.DEEPL_API_KEY?.startsWith('test')
  ? 'https://api-free.deepl.com/v2'
  : 'https://api-free.deepl.com/v2'

const ALLOWED_TARGETS = ['BG', 'CS', 'DA', 'DE', 'EL', 'EN', 'ES', 'ET', 'FI', 'FR', 'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL', 'PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR', 'UK', 'ZH']
const MAX_TEXT_LENGTH = 10000

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
}

interface RateLimitEntry { count: number; resetTime: number }
declare global {
  var translateStore: Map<string, RateLimitEntry> | undefined
}
if (!global.translateStore) global.translateStore = new Map()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = `translate_${ip}`
  const store = global.translateStore!
  const entry = store.get(key)
  if (!entry || entry.resetTime < now) {
    store.set(key, { count: 1, resetTime: now + 60000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  if (!checkRateLimit(ip)) {
    return apiError("Too Many Requests", 429)
  }

  let body: { text?: string; targetLang?: string }
  try {
    body = await request.json()
  } catch {
    return apiError("Invalid JSON", 400)
  }

  const { text, targetLang } = body

  if (!text || typeof text !== 'string') {
    return apiError("text is required", 400)
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text exceeds ${MAX_TEXT_LENGTH} characters` }, { status: 413 })
  }

  const lang = (targetLang || 'EN').toUpperCase().split('-')[0]
  if (!ALLOWED_TARGETS.includes(lang)) {
    return NextResponse.json({ error: `Unsupported target language: ${lang}` }, { status: 400 })
  }

  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) {
    return apiError("Translation service not configured", 500)
  }

  try {
    const res = await fetch(`${DEEPL_API_BASE}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: lang,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('DeepL API error:', res.status, err)
      return apiError("Translation failed", 502)
    }

    const data = await res.json()
    return apiSuccess({ translated: data.translations[0].text })
  } catch (err) {
    console.error('Translation request failed:', err)
    return apiError("Translation request failed", 502)
  }
}
