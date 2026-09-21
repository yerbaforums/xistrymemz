'use client'

import { useState } from 'react'
import MediaPlayer from '@/components/MediaPlayer'
import {
  normalizeVideoUrl,
  normalizeAudioUrl,
  POST_VIDEO_KINDS,
  GENERAL_AUDIO_KINDS,
  MEDIA_LINK_HINT,
  AUDIO_LINK_HINT,
  type EmbedKind,
} from '@/lib/media-links'

/**
 * Validated media-URL field with live preview. Used everywhere creators link
 * (rather than upload) video/audio: school lessons, projects, podcasts.
 */
export default function MediaLinkInput({
  value,
  onChange,
  kinds = POST_VIDEO_KINDS,
  placeholder = 'https://youtube.com/watch?v=...',
  allowAudio = false,
}: {
  value: string
  onChange: (url: string) => void
  kinds?: EmbedKind[]
  placeholder?: string
  allowAudio?: boolean
}) {
  const [error, setError] = useState('')

  const validKind = (raw: string): boolean => {
    if (!raw.trim()) return true
    const v = normalizeVideoUrl(raw)
    if (v && kinds.includes(v.kind)) return true
    if (allowAudio) {
      const a = normalizeAudioUrl(raw)
      if (a && (kinds.includes(a.kind) || GENERAL_AUDIO_KINDS.includes(a.kind))) return true
    }
    return false
  }

  const valid = validKind(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="url"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          const raw = e.target.value
          setError(raw.trim() && !validKind(raw) ? (allowAudio ? AUDIO_LINK_HINT : MEDIA_LINK_HINT) : '')
        }}
        placeholder={placeholder}
        style={{
          padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem',
          border: `1px solid ${error || (value.trim() && !valid) ? '#ef4444' : 'var(--border-color)'}`,
          background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '100%',
        }}
      />
      {(error || (value.trim() && !valid)) && (
        <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{error || (allowAudio ? AUDIO_LINK_HINT : MEDIA_LINK_HINT)}</small>
      )}
      {value.trim() && valid && (
        <div style={{ marginTop: 2 }}>
          <MediaPlayer url={value.trim()} />
        </div>
      )}
    </div>
  )
}
