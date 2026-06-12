import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import type { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'it', 'ru', 'ar', 'de', 'hi', 'ja', 'zh', 'ko', 'nl', 'pl', 'sv', 'tr']

export async function POST(request: NextRequest) {
  let body: { language?: string; email?: string; nativeName?: string }
  try {
    body = await request.json()
  } catch {
    return apiError("Invalid JSON", 400)
  }

  const { language, email, nativeName } = body

  if (!language || typeof language !== 'string' || language.trim().length === 0) {
    return apiError("Language is required", 400)
  }

  const normalized = language.trim().toLowerCase()
  if (SUPPORTED_LOCALES.includes(normalized)) {
    return NextResponse.json({ error: `${language} is already supported!` }, { status: 400 })
  }

  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return apiError("Invalid email address", 400)
  }

  const entry = {
    language: language.trim(),
    nativeName: nativeName?.trim() || '',
    email: email?.trim() || '',
    requestedAt: new Date().toISOString(),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'language-requests.json')
    let requests: typeof entry[] = []
    try {
      const existing = fs.readFileSync(filePath, 'utf8')
      requests = JSON.parse(existing)
    } catch { /* start fresh */ }
    requests.push(entry)
    fs.writeFileSync(filePath, JSON.stringify(requests, null, 2))

    // If Resend is configured, send email notification
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
      if (adminEmails.length > 0) {
        const emailBody = `
New language request received:
  Language: ${entry.language}${entry.nativeName ? ` (${entry.nativeName})` : ''}
  Email: ${entry.email || 'Not provided'}
  Requested at: ${entry.requestedAt}
        `.trim()

        for (const adminEmail of adminEmails) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: process.env.EMAIL_FROM || 'noreply@xistrymemz.xyz',
                to: adminEmail,
                subject: `Language Request: ${entry.language}`,
                text: emailBody,
              }),
            })
          } catch { /* email fail is non-fatal */ }
        }
      }
    }

    return NextResponse.json({ success: true, message: `Language request for "${entry.language}" submitted` })
  } catch {
    return apiError("Failed to save request", 500)
  }
}
