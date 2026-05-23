'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useVideoChat } from '@/hooks/useVideoChat'
import styles from './VideoChatModal.module.css'

interface VideoChatModalProps {
  roomId?: string
  inviteCode?: string
  onClose: () => void
  mode?: 'modal' | 'inline'
}

export default function VideoChatModal({ roomId: initialRoomId, inviteCode, onClose, mode = 'modal' }: VideoChatModalProps) {
  const { data: session } = useSession()
  const {
    room, localStream, peers, error, connecting,
    audioEnabled, videoEnabled, isScreenSharing,
    createRoom, joinRoom, startCall, leaveRoom,
    toggleAudio, toggleVideo, toggleScreenShare
  } = useVideoChat(initialRoomId, session?.user?.id)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const joinedRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(mode === 'modal')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inviteCode && !joinedRef.current && !room) {
      joinedRef.current = true
      joinRoom(inviteCode).then(r => {
        if (r) setTimeout(() => startCall(), 500)
      })
    } else if (!initialRoomId && !inviteCode && !room && !joinedRef.current) {
      joinedRef.current = true
      createRoom().then(r => {
        if (r) setTimeout(() => startCall(), 500)
      })
    }
  }, [inviteCode, initialRoomId, room, joinRoom, createRoom, startCall])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const handleEndCall = async () => {
    await leaveRoom()
    onClose()
  }

  const copyInvite = () => {
    if (room?.inviteCode) {
      const url = `${window.location.origin}/dashboard/video?invite=${room.inviteCode}`
      navigator.clipboard.writeText(url)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const wrapperClass = mode === 'modal'
    ? styles.modalOverlay
    : isFullscreen
      ? styles.modalOverlay
      : styles.inlineContainer

  return (
    <div ref={containerRef} className={wrapperClass}>
      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.videoGrid}>
        {localStream && (
          <div className={styles.videoTile}>
            <video ref={localVideoRef} autoPlay playsInline muted
              className={`${styles.video} ${!videoEnabled && !isScreenSharing ? styles.videoOff : ''}`}
              style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }} />
            {!videoEnabled && !isScreenSharing && (
              <div className={styles.videoPlaceholder}>📹 Camera Off</div>
            )}
            <span className={styles.videoLabel}>
              {isScreenSharing ? '🖥️ Screen' : 'You'}
              {!audioEnabled && ' 🔇'}
            </span>
          </div>
        )}
        {peers.filter(p => p.connected).map(p => (
          <PeerVideo key={p.userId} peer={p} />
        ))}
        {connecting && (
          <div className={styles.connectingTile}>Connecting...</div>
        )}
      </div>

      <div className={styles.controls}>
        <button
          onClick={toggleAudio}
          className={`${styles.controlBtn} ${!audioEnabled ? styles.controlOff : ''}`}
          title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {audioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          onClick={toggleVideo}
          className={`${styles.controlBtn} ${!videoEnabled ? styles.controlOff : ''}`}
          title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          disabled={isScreenSharing}
        >
          {videoEnabled ? '📹' : '📷'}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`${styles.controlBtn} ${isScreenSharing ? styles.controlActive : ''}`}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          {isScreenSharing ? '🖥️✓' : '🖥️'}
        </button>
        {room?.inviteCode && (
          <button onClick={copyInvite} className={styles.controlBtn} title="Copy invite link">
            📋 Invite
          </button>
        )}
        {mode === 'inline' && (
          <button onClick={toggleFullscreen} className={styles.controlBtn} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? '◧' : '◨'}
          </button>
        )}
        <button onClick={handleEndCall} className={styles.endCallBtn} title="End call">
          🔴 End
        </button>
      </div>
    </div>
  )
}

function PeerVideo({ peer }: { peer: any }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream
    }
  }, [peer.stream])

  return (
    <div className={styles.videoTile}>
      {peer.stream ? (
        <video ref={videoRef} autoPlay playsInline className={styles.video} />
      ) : (
        <div className={styles.videoPlaceholder}>Connecting...</div>
      )}
      <span className={styles.videoLabel}>{peer.userId.slice(0, 8)}</span>
    </div>
  )
}