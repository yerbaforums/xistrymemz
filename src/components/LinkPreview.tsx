'use client'

import { useEffect, useState } from 'react'

interface PreviewData {
  title: string | null
  description: string | null
  image: string | null
  domain: string
}

const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi

export default function LinkPreview({ text }: { text: string }) {
  const [previews, setPreviews] = useState<Map<string, PreviewData>>(new Map())
  const [loading, setLoading] = useState(false)

  const urls = [...new Set(text.match(URL_REGEX) || [])]

  useEffect(() => {
    if (urls.length === 0) return
    setLoading(true)
    Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
          if (!res.ok) return [url, { title: null, description: null, image: null, domain: new URL(url).hostname }] as const
          const data = await res.json()
          return [url, data] as const
        } catch {
          return [url, { title: null, description: null, image: null, domain: new URL(url).hostname }] as const
        }
      })
    ).then(results => {
      setPreviews(new Map(results))
      setLoading(false)
    })
  }, [text])

  if (urls.length === 0 || loading) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      {urls.map((url) => {
        const data = previews.get(url)
        if (!data || (!data.title && !data.description && !data.image)) {
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '8px 12px', borderRadius: 8,
                background: 'var(--bg-tertiary)', fontSize: '0.8rem',
                color: 'var(--accent-primary)', textDecoration: 'none',
                wordBreak: 'break-all', border: '1px solid var(--border-color)',
              }}
            >
              🔗 {url}
            </a>
          )
        }

        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', gap: 12, padding: 12, borderRadius: 10,
              background: 'var(--bg-tertiary)', textDecoration: 'none',
              border: '1px solid var(--border-color)',
              transition: 'border-color 0.15s',
              overflow: 'hidden',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            {data.image && (
              <div style={{
                width: 80, height: 80, borderRadius: 6, overflow: 'hidden',
                flexShrink: 0, background: 'var(--bg-secondary)',
              }}>
                <img
                  src={data.image}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {data.title && (
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.3 }}>
                  {data.title}
                </div>
              )}
              {data.description && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {data.description}
                </div>
              )}
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {data.domain}
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}
