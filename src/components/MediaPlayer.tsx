'use client'

import { useEffect, useState } from 'react'
import { normalizeVideoUrl, normalizeAudioUrl } from '@/lib/media-links'
import styles from './MediaPlayer.module.css'

/**
 * Embed-aware media renderer. Handles YouTube/Vimeo/SoundCloud iframes and
 * direct video/audio files — everything the link-based directory posture
 * allows users to share without uploading.
 */
export default function MediaPlayer({
  url,
  poster,
  title,
}: {
  url: string
  poster?: string
  title?: string
}) {
  const [autoplay, setAutoplay] = useState(false)
  useEffect(() => {
    try {
      setAutoplay(document.documentElement.dataset.feedAutoplay !== 'off')
    } catch {}
  }, [])

  const video = normalizeVideoUrl(url)
  if (video && (video.kind === 'youtube' || video.kind === 'vimeo')) {
    const sep = video.url.includes('?') ? '&' : '?'
    const src = autoplay
      ? `${video.url}${sep}${video.kind === 'youtube' ? 'autoplay=1&mute=1' : 'autoplay=1&muted=1'}`
      : video.url
    return (
      <div className={styles.frame}>
        <iframe
          src={src}
          title={title || 'Embedded video'}
          className={styles.iframe}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  const audio = normalizeAudioUrl(url)
  if (audio && audio.kind === 'soundcloud') {
    return (
      <div className={styles.audioFrame}>
        <iframe
          src={audio.url}
          title={title || 'Embedded audio'}
          className={styles.audioIframe}
          allow="autoplay"
        />
      </div>
    )
  }

  if (video && video.kind === 'direct-video') {
    return (
      <div className={styles.frame}>
        <video
          src={video.url}
          controls
          preload="metadata"
          poster={poster}
          className={styles.video}
          {...(autoplay ? { autoPlay: true, muted: true, loop: true, playsInline: true } : {})}
        />
      </div>
    )
  }

  if (audio && audio.kind === 'direct-audio') {
    return (
      <div className={styles.audioFrame}>
        <audio src={audio.url} controls preload="none" className={styles.audio} />
      </div>
    )
  }

  // Fallback: unknown host — offer the outbound link instead of a dead player.
  return (
    <a href={url} target="_blank" rel="noreferrer" className={styles.fallbackLink}>
      🔗 {title || url}
    </a>
  )
}
