'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import VideoChatModal from '@/components/VideoChatModal'
import styles from './video.module.css'
import Skeleton from '@/components/Skeleton'

interface RoomSummary {
  id: string
  name: string
  inviteCode: string
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string | null; image: string | null }
  participants: { userId: string; user: { id: string; name: string | null; image: string | null } }[]
}

export default function VideoChatPage() {
  const { data: session } = useSession()
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | undefined>(undefined)
  const [showCall, setShowCall] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [error, setError] = useState('')
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setJoinInput(invite)
      setInviteCode(invite)
      setShowCall(true)
    }
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/video/rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    setActiveRoomId(null)
    setInviteCode(undefined)
    setShowCall(true)
  }

  const handleJoinRoom = () => {
    const code = joinInput.trim()
    if (!code) {
      setError('Enter an invite code or link')
      return
    }
    const extracted = code.includes('invite=') ? code.split('invite=')[1].split('&')[0] : code
    setInviteCode(extracted)
    setShowCall(true)
  }

  const handleJoinExisting = (room: RoomSummary) => {
    setActiveRoomId(room.id)
    setInviteCode(undefined)
    setShowCall(true)
  }

  const handleCloseCall = () => {
    setShowCall(false)
    setActiveRoomId(null)
    setInviteCode(undefined)
    fetchRooms()
  }

  const handleCopyInvite = (room: RoomSummary) => {
    const url = `${window.location.origin}/dashboard/video?invite=${room.inviteCode}`
    navigator.clipboard.writeText(url)
    setCopiedRoom(room.id)
    setTimeout(() => setCopiedRoom(null), 2000)
  }

  const handleDeleteRoom = async (room: RoomSummary) => {
    if (!confirm(`End "${room.name}"? This will disconnect all participants.`)) return
    try {
      const res = await fetch(`/api/video/rooms/${room.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRooms()
      }
    } catch {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>📹 Video Chat</h1>
        <p>Start or join a video session with other members.</p>
      </div>

      <div className={styles.actions}>
        <button onClick={handleCreateRoom} className={styles.primaryBtn}>
          ➕ Create Room
        </button>
        <div className={styles.joinRow}>
          <input
            type="text"
            value={joinInput}
            onChange={e => { setJoinInput(e.target.value); setError('') }}
            placeholder="Paste invite code or link..."
            className={styles.joinInput}
          />
          <button onClick={handleJoinRoom} className={styles.secondaryBtn}>
            Join
          </button>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {showCall && (
        <div className={styles.callContainer}>
          <VideoChatModal
            roomId={activeRoomId || undefined}
            inviteCode={inviteCode}
            onClose={handleCloseCall}
            mode="inline"
          />
        </div>
      )}

      <div className={styles.section}>
        <h2>Your Active Rooms</h2>
        {loading ? (
          <Skeleton width="100%" height="1rem" />
        ) : rooms.length === 0 ? (
          <div className={styles.empty}>
            <p>No active rooms. Create one to start a video chat!</p>
          </div>
        ) : (
          <div className={styles.roomList}>
            {rooms.map(r => (
              <div key={r.id} className={styles.roomCard}>
                <div className={styles.roomInfo}>
                  <strong>{r.name}</strong>
                  <span className={styles.roomMeta}>
                    {r.participants.length} participant{r.participants.length !== 1 ? 's' : ''} · Created by {r.createdBy.name || 'Unknown'}
                  </span>
                  <div className={styles.avatars}>
                    {r.participants.map(p => (
                      <div key={p.userId} className={styles.avatar} title={p.user.name || ''}>
                        {p.user.image ? (
                          <img src={p.user.image} alt="" className={styles.avatarImg} />
                        ) : (
                          <span className={styles.avatarPlaceholder}>{(p.user.name || '?')[0]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.roomActions}>
                  <button onClick={() => handleJoinExisting(r)} className={styles.joinBtn}>
                    Join
                  </button>
                  <button onClick={() => handleCopyInvite(r)} className={styles.shareBtn} title="Copy invite link">
                    {copiedRoom === r.id ? '✓ Copied' : '🔗 Share'}
                  </button>
                  {r.createdBy.id === session?.user?.id && (
                    <button onClick={() => handleDeleteRoom(r)} className={styles.deleteBtn} title="End room">
                      🗑️ End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}