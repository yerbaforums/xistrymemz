'use client'

// Client-side media helpers for uploads. Kept in one place so the upload
// UI (posts, blog, podcast episodes) enforces the same limits and provides
// the same feedback.

export const MAX_VIDEO_DURATION_SEC = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_SEC || 15 * 60) // 15 min default
export const MAX_VIDEO_SIZE_MB = 200
export const MAX_AUDIO_SIZE_MB = 150
// Files above this size get best-effort re-encoded in the browser to keep
// storage small and stay under platform request-body limits.
export const VIDEO_COMPRESS_THRESHOLD_MB = 40
export const VIDEO_COMPRESS_BITRATE = 1_200_000 // 1.2 Mbps target
export const AUDIO_COMPRESS_BITRATE = 96_000 // 96 kbps target (plenty for speech)

function maxSecondsFromSize(sizeBytes: number): number {
  // Rough upper bound on duration given target bitrate + overhead (~8%).
  return (sizeBytes * 8) / (VIDEO_COMPRESS_BITRATE * 1.08)
}

/** True when a video should be re-encoded client-side before upload. */
export function shouldCompressVideo(sizeBytes: number): boolean {
  return sizeBytes > VIDEO_COMPRESS_THRESHOLD_MB * 1024 * 1024
}

/** True when the source video is longer than the platform allows. */
export function exceedsMaxDuration(sizeBytes: number): boolean {
  return maxSecondsFromSize(sizeBytes) > MAX_VIDEO_DURATION_SEC
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

/** Probe the duration of a media file in the browser. Resolves null on any error. */
export function probeMediaDuration(file: File, kind: 'video' | 'audio'): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(kind)
    el.preload = 'metadata'
    el.muted = true
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null)
    el.onerror = () => done(null)
    el.onloadeddata = () => { /* metadata is enough */ }
    el.src = url
  })
}

function mimeSupported(candidates: string[]): string | null {
  for (const m of candidates) {
    try {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * Best-effort browser re-encode of a video file to a compact webm/mp4 blob
 * using captureStream + MediaRecorder. Resolves the compressed File, or the
 * ORIGINAL file when compression is unsupported/fails (never blocks uploads).
 */
export async function compressVideo(file: File, targetBitrate = VIDEO_COMPRESS_BITRATE): Promise<File> {
  try {
    if (typeof document === 'undefined') return file

    const mime = mimeSupported([
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/mp4;codecs=h264,aac',
    ]) || mimeSupported(['video/webm', 'video/mp4'])
    if (!mime || typeof (document.createElement('video') as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream === 'undefined') {
      return file
    }

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.muted = false
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    const duration = await new Promise<number | null>((resolve) => {
      video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : null)
      video.onerror = () => resolve(null)
    })
    if (!duration) {
      URL.revokeObjectURL(url)
      return file
    }

    await video.play().catch(() => {})
    // Seek slightly ahead so a real frame is available for capture.
    video.currentTime = Math.min(video.duration / 2, 1)

    const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()
    if (!stream) {
      video.pause()
      URL.revokeObjectURL(url)
      return file
    }

    const options: MediaRecorderOptions = { mimeType: mime, videoBitsPerSecond: targetBitrate }
    const recorder = new MediaRecorder(stream, options)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime.split(';')[0] })
        if (blob.size > 0 && blob.size < file.size) resolve(blob)
        else reject(new Error('Compression did not shrink the file'))
      }
      recorder.onerror = () => reject(new Error('Recorder error'))
    })

    recorder.start(1000)
    // Record for the full source duration, then stop.
    await new Promise<void>((resolve) => {
      const started = Date.now()
      const iv = setInterval(() => {
        if (Date.now() - started >= duration * 1000 || recorder.state === 'inactive') {
          clearInterval(iv)
          if (recorder.state !== 'inactive') recorder.stop()
          resolve()
        }
      }, 250)
    })
    const blob = await done

    video.pause()
    URL.revokeObjectURL(url)
    stream.getTracks().forEach((tr) => tr.stop())

    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + `.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}

/** Best-effort browser audio re-encode (e.g. large WAV/webm sources). */
export async function compressAudio(file: File, targetBitrate = AUDIO_COMPRESS_BITRATE): Promise<File> {
  try {
    if (typeof document === 'undefined' || typeof AudioContext === 'undefined') return file

    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.src = url
    audio.crossOrigin = 'anonymous'

    const decoded = await new Promise<AudioBuffer | null>((resolve) => {
      audio.onloadeddata = async () => {
        try {
          const ctx = new AudioContext()
          const buf = await ctx.decodeAudioData(await file.arrayBuffer())
          ctx.close()
          resolve(buf)
        } catch {
          resolve(null)
        }
      }
      audio.onerror = () => resolve(null)
    })
    if (!decoded) {
      URL.revokeObjectURL(url)
      return file
    }

    const mrMime = mimeSupported(['audio/mp4', 'audio/webm', 'audio/ogg'])
    if (!mrMime) {
      URL.revokeObjectURL(url)
      return file
    }
    const ctx = new AudioContext()
    const dest = ctx.createMediaStreamDestination()
    const source = ctx.createBufferSource()
    source.buffer = decoded
    source.connect(dest)
    // A light high-pass to reduce rumble keeps speech crisp at low bitrates.
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 60
    source.connect(filter)
    filter.connect(dest)

    const recorder = new MediaRecorder(dest.stream, { mimeType: mrMime, audioBitsPerSecond: targetBitrate })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mrMime.split(';')[0] })
        if (blob.size > 0 && blob.size < file.size) resolve(blob)
        else reject(new Error('Compression did not shrink the file'))
      }
      recorder.onerror = () => reject(new Error('Recorder error'))
    })

    source.start()
    recorder.start(1000)
    await new Promise<void>((resolve) => {
      const started = Date.now()
      const iv = setInterval(() => {
        if (Date.now() - started >= decoded.duration * 1000 || recorder.state === 'inactive') {
          clearInterval(iv)
          if (recorder.state !== 'inactive') recorder.stop()
          resolve()
        }
      }, 250)
    })
    const blob = await done

    URL.revokeObjectURL(url)
    dest.stream.getTracks().forEach((tr) => tr.stop())
    source.disconnect()

    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + `.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}