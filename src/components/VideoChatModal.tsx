'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useVideoChat } from '@/hooks/useVideoChat'

interface VideoChatModalProps {
  roomId?: string
  inviteCode?: string
  onClose: () => void
}

export default function VideoChatModal({ roomId: initialRoomId, inviteCode, onClose }: VideoChatModalProps) {
  const { data: session } = useSession()
  const {
    room, localStream, peers, error, connecting,
    createRoom, joinRoom, startCall, leaveRoom
  } = useVideoChat(initialRoomId, session?.user?.id)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const joinedRef = useRef(false)

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a', display: 'flex', flexDirection: 'column',
    }}>
      {error && (
        <div style={{
          padding: 12, margin: 8, borderRadius: 8, background: 'rgba(239,68,68,0.15)',
          color: '#ef4444', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      <div style={{
        flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, alignContent: 'center', justifyContent: 'center',
      }}>
        {localStream && (
          <div style={{ position: 'relative', width: 320, height: 240, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a' }}>
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: '0.7rem', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>
              You
            </span>
          </div>
        )}
        {peers.filter(p => p.connected).map(p => (
          <PeerVideo key={p.userId} peer={p} />
        ))}
        {connecting && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 320, height: 240, borderRadius: 8, background: '#1a1a1a', color: '#888', fontSize: '0.85rem' }}>
            Connecting...
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        borderTop: '1px solid #222',
      }}>
        {room?.inviteCode && (
          <button onClick={copyInvite} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a',
            color: '#ccc', cursor: 'pointer', fontSize: '0.8rem',
          }}>
            📋 Copy Invite Link
          </button>
        )}
        <button onClick={handleEndCall} style={{
          padding: '10px 28px', borderRadius: 24, border: 'none', background: '#ef4444',
          color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
        }}>
          🔴 End Call
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
    <div style={{ position: 'relative', width: 320, height: 240, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a' }}>
      {peer.stream ? (
        <video ref={videoRef} autoPlay playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.8rem' }}>
          Connecting...
        </div>
      )}
      <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: '0.7rem', color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>
        {peer.userId.slice(0, 8)}
      </span>
    </div>
  )
}
