'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/context/ToastContext'
import { probeMediaDuration, formatDuration, compressAudio, MAX_AUDIO_SIZE_MB } from '@/lib/media'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const { error: toastError } = useToast()

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
      ) : (
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
      )}
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}