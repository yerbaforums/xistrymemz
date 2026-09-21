'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/context/ToastContext'
import { probeMediaDuration, formatDuration, compressAudio, MAX_AUDIO_SIZE_MB } from '@/lib/media'
import { normalizeAudioUrl, EPISODE_AUDIO_KINDS, AUDIO_LINK_HINT } from '@/lib/media-links'

interface AudioUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
  onDuration?: (seconds: number) => void
  maxSizeMB?: number
  label?: string
}

const ACCEPT = 'audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav'

export default function AudioUploader({
  value,
  onChange,
  onDuration,
  maxSizeMB = MAX_AUDIO_SIZE_MB,
  label = 'Upload audio',
}: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [linkMode, setLinkMode] = useState(false)
  const [link, setLink] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { error: toastError } = useToast()

  const handleLink = () => {
    const norm = normalizeAudioUrl(link)
    if (!norm || !EPISODE_AUDIO_KINDS.includes(norm.kind)) {
      toastError(AUDIO_LINK_HINT)
      return
    }
    // Linked files were not probed locally; duration stays 0 (unknown).
    setDuration(null)
    onDuration?.(0)
    onChange(norm.original)
    setLink('')
    setLinkMode(false)
  }

  const handleSelect = () => inputRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > maxSizeMB * 1024 * 1024) {
      toastError(`Audio too large. Max ${maxSizeMB}MB`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const dur = await probeMediaDuration(file, 'audio')
      if (dur !== null) {
        setDuration(dur)
        onDuration?.(Math.round(dur))
      }

      let uploadFile = file
      // Re-encode big WAV files in-browser to keep storage/transit small.
      // Already-compressed formats (mp3/m4a/ogg/opus) gain nothing from a
      // decode → re-encode round-trip and risk OOMing the tab, so skip them.
      const isWav = file.type === 'audio/wav' || file.type === 'audio/x-wav' || file.name.toLowerCase().endsWith('.wav')
      if (file.size > 25 * 1024 * 1024 && isWav) {
        setOptimizing(true)
        uploadFile = await compressAudio(file)
      }

      const formData = new FormData()
      formData.append('file', uploadFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = Array.isArray(data.uploads) ? (data.uploads[0] as { url: string })?.url : data.url
      if (!url) throw new Error('No URL returned')
      onChange(url)
    } catch {
      toastError('Failed to upload audio')
    } finally {
      setUploading(false)
      setOptimizing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <audio controls src={value} preload="metadata" style={{ maxWidth: '100%', height: 40, borderRadius: 8 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {duration ? formatDuration(duration) : 'Ready'}
          </span>
          <button
            type="button"
            onClick={() => { onChange(null); setDuration(null) }}
            aria-label="Remove audio"
            style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ✕ Remove
          </button>
        </div>
      ) : linkMode ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLink() } }}
            placeholder="https://example.com/episode.mp3"
            style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
          />
          <button type="button" onClick={handleLink} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Add</button>
          <button type="button" onClick={() => { setLinkMode(false); setLink('') }} style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }} title="Back to upload">\u2715</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleSelect}
          disabled={uploading || optimizing}
          title={label}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
        >
          <span style={{ fontSize: '1.2rem' }}>{optimizing ? '⚙️' : uploading ? '⏳' : '🎙️'}</span>
          {optimizing ? 'Optimizing audio…' : uploading ? 'Uploading…' : label}
        </button>
          <button
            type="button"
            onClick={() => setLinkMode(true)}
            title="Paste a direct audio link instead (mp3, m4a, ogg — keeps your RSS feed valid)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🔗</span> Link
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}