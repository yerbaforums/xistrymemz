'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'

const LOCALE_TO_DEEPL: Record<string, string> = {
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  pt: 'PT',
  pt_BR: 'PT',
  de: 'DE',
  it: 'IT',
  ja: 'JA',
  ko: 'KO',
  zh: 'ZH',
  ru: 'RU',
  nl: 'NL',
  pl: 'PL',
  sv: 'SV',
  da: 'DA',
  fi: 'FI',
  cs: 'CS',
  el: 'EL',
  hu: 'HU',
  ro: 'RO',
  sk: 'SK',
  sl: 'SL',
  et: 'ET',
  lv: 'LV',
  lt: 'LT',
  bg: 'BG',
  nb: 'NB',
  tr: 'TR',
  uk: 'UK',
  id: 'ID',
}

interface Props {
  text: string | null | undefined
  className?: string
}

export default function TranslateButton({ text, className }: Props) {
  const locale = useLocale()
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const targetLang = LOCALE_TO_DEEPL[locale] || 'EN'

  const handleTranslate = useCallback(async () => {
    if (translated) {
      setShowOriginal(!showOriginal)
      return
    }

    if (!text || text.length > 10000) {
      setError('Content too long to translate')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Translation failed')
      }

      const data = await res.json()
      setTranslated(data?.data?.translated || data?.translated)
      setShowOriginal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }, [text, targetLang, translated, showOriginal])

  if (!text) return null

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary, #ef4444)' }}>{error}</span>
      )}
      {loading && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Translating...</span>
      )}
      {translated && !showOriginal && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          {translated}
          <button
            onClick={() => setShowOriginal(true)}
            style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
          >
            Show original
          </button>
        </span>
      )}
      {!loading && !error && (
        <button
          onClick={handleTranslate}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #00d9ff)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
          title={`Translate to ${targetLang}`}
        >
          {translated && showOriginal ? '🌐 Show translated' : '🌐 Translate'}
        </button>
      )}
    </span>
  )
}
