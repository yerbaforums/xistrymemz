'use client'

import { useState, useRef } from 'react'

interface ImageUploaderProps {
  images: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  maxSizeMB?: number
}

export default function ImageUploader({ images, onChange, maxImages = 6, maxSizeMB = 20 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = () => inputRef.current?.click()

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of files) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          alert(`File too large: ${file.name}. Max ${maxSizeMB}MB`)
          continue
        }
        formData.append('file', file)
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const newUrls = Array.isArray(data.uploads) ? data.uploads.map((u: any) => u.url) : [data.url]
      onChange([...images, ...newUrls])
    } catch {
      alert('Failed to upload images')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => remove(i)}
              style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center', padding: 0 }}
            >×</button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={handleSelect}
            disabled={uploading}
            style={{ width: 72, height: 72, borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--text-secondary)' }}
          >
            {uploading ? '...' : '+'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleFiles} style={{ display: 'none' }} />
    </div>
  )
}
