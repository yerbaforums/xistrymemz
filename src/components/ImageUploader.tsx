'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useToast } from '@/context/ToastContext'
import { probeMediaDuration, formatDuration, compressVideo, shrinkImage, MAX_VIDEO_DURATION_SEC, MAX_VIDEO_SIZE_MB, shouldCompressVideo } from '@/lib/media'
import { normalizeVideoUrl, POST_VIDEO_KINDS, MEDIA_LINK_HINT } from '@/lib/media-links'

interface ImageUploaderProps {
  images: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  maxSizeMB?: number
  /** Optional single video attachment (mp4/webm, up to 15 min / 200MB). Pass handlers to enable video upload. */
  videoUrl?: string | null
  onVideoUrlChange?: (url: string | null) => void
  videoMaxSizeMB?: number
  videoLabel?: string
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 6,
  maxSizeMB = 20,
  videoUrl,
  onVideoUrlChange,
  videoMaxSizeMB = MAX_VIDEO_SIZE_MB,
  videoLabel = 'Add a video',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoOptimizing, setVideoOptimizing] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [videoLinkMode, setVideoLinkMode] = useState(false)
  const [videoLink, setVideoLink] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const { error: toastError } = useToast()
  const supportsVideo = !!onVideoUrlChange

  const handleSelect = () => inputRef.current?.click()
  const handleVideoSelect = () => videoInputRef.current?.click()

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (images.length + files.length > maxImages) {
      toastError(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of files) {
        // Shrink photos in-browser first (1600px WebP): beats the 4.5MB
        // serverless body wall and keeps free-tier storage tiny.
        const processed = await shrinkImage(file)
        if (processed.size > maxSizeMB * 1024 * 1024) {
          toastError(`File too large: ${file.name}. Max ${maxSizeMB}MB`)
          continue
        }
        formData.append('file', processed, processed.name)
      }
      if (![...formData.keys()].length) return

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const newUrls = Array.isArray(data.uploads) ? (data.uploads as Array<{ url: string }>).map((u) => u.url) : [data.url]
      onChange([...images, ...newUrls])
    } catch {
      toastError('Failed to upload images')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleVideoLink = () => {
    const norm = normalizeVideoUrl(videoLink)
    if (!norm || !POST_VIDEO_KINDS.includes(norm.kind)) {
      toastError(MEDIA_LINK_HINT)
      return
    }
    onVideoUrlChange!(norm.original)
    setVideoLink('')
    setVideoLinkMode(false)
  }

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onVideoUrlChange) return
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      toastError('Only MP4 or WebM videos are supported')
      if (videoInputRef.current) videoInputRef.current.value = ''
      return
    }
    if (file.size > videoMaxSizeMB * 1024 * 1024) {
      toastError(`Video too large. Max ${videoMaxSizeMB}MB`)
      if (videoInputRef.current) videoInputRef.current.value = ''
      return
    }

    setVideoUploading(true)
    try {
      const duration = await probeMediaDuration(file, 'video')
      if (duration !== null && duration > MAX_VIDEO_DURATION_SEC) {
        toastError(`Video is ${formatDuration(duration)}. Maximum length is ${formatDuration(MAX_VIDEO_DURATION_SEC)}.`)
        if (videoInputRef.current) videoInputRef.current.value = ''
        return
      }
      setVideoDuration(duration)

      // Re-encode large clips in-browser so uploads stay small and fast.
      let uploadFile = file
      if (shouldCompressVideo(file.size)) {
        setVideoOptimizing(true)
        uploadFile = await compressVideo(file)
        if (uploadFile.size < file.size) {
          const compressedDuration = await probeMediaDuration(uploadFile, 'video')
          if (compressedDuration !== null) setVideoDuration(compressedDuration)
        }
      }

      const formData = new FormData()
      formData.append('file', uploadFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = Array.isArray(data.uploads) ? (data.uploads[0] as { url: string })?.url : data.url
      if (!url) throw new Error('No URL returned')
      onVideoUrlChange(url)
    } catch {
      toastError('Failed to upload video')
    } finally {
      setVideoUploading(false)
      setVideoOptimizing(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <Image src={url} alt="" width={72} height={72} style={{ objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label="Remove image"
              style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center', padding: 0 }}
            >×</button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={handleSelect}
            disabled={uploading}
            title="Upload images"
            style={{ width: 72, height: 72, borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--text-secondary)' }}
          >
            {uploading ? '...' : '🖼️'}
          </button>
        )}

        {supportsVideo && (
          videoUrl ? (
            <div style={{ position: 'relative', width: 128, height: 72, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
              {(() => { const k = normalizeVideoUrl(videoUrl)?.kind; return k === 'direct-video' ? (
                <video src={videoUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '1.4rem' }}>🔗</span>
              ) })()}
              <button
                type="button"
                onClick={() => { onVideoUrlChange!(null); setVideoDuration(null) }}
                aria-label="Remove video"
                style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center', padding: 0 }}
              >×</button>
              <span style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '10px', color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '0 4px' }}>
                ▶ {videoDuration ? formatDuration(videoDuration) : 'Video'}
              </span>
            </div>
          ) : videoLinkMode ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 220 }}>
              <input
                type="url"
                value={videoLink}
                onChange={e => setVideoLink(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVideoLink() } }}
                placeholder="https://youtube.com/watch?v=…"
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              />
              <button type="button" onClick={handleVideoLink} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Add</button>
              <button type="button" onClick={() => { setVideoLinkMode(false); setVideoLink('') }} style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }} title="Back to upload">✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleVideoSelect}
              disabled={videoUploading || videoOptimizing}
              title={videoLabel}
              style={{ width: 104, height: 72, borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, fontSize: '0.7rem', color: 'var(--text-secondary)' }}
            >
              {videoOptimizing ? <span style={{ fontSize: '1.1rem' }}>⚙️</span> : videoUploading ? <span style={{ fontSize: '1.2rem' }}>...</span> : <span style={{ fontSize: '1.3rem' }}>🎬</span>}
              <span>{videoOptimizing ? 'Optimizing…' : videoUploading ? 'Uploading…' : 'Video'}</span>
            </button>
              <button
                type="button"
                onClick={() => setVideoLinkMode(true)}
                title="Paste a video link instead (YouTube, Vimeo, mp4)"
                style={{ height: 72, padding: '0 12px', borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, fontSize: '0.7rem', color: 'var(--text-secondary)' }}
              >
                <span style={{ fontSize: '1.3rem' }}>🔗</span>
                <span>Link</span>
              </button>
            </div>
          )
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleFiles} style={{ display: 'none' }} />
      {supportsVideo && (
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" onChange={handleVideoFile} style={{ display: 'none' }} />
      )}
    </div>
  )
}