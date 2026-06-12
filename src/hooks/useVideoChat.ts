'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const STUN_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

interface Peer {
  userId: string
  peer: any
  stream?: MediaStream
  connected: boolean
}

interface RoomInfo {
  id: string
  inviteCode: string
  name: string
  createdBy: { id: string; name: string | null; image: string | null }
  participants: { userId: string; user: { id: string; name: string | null; image: string | null } }[]
}

interface SignalData {
  fromUserId: string
  type: string
  data: any
}

export function useVideoChat(initialRoomId?: string, currentUserId?: string) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [peers, setPeers] = useState<Peer[]>([])
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const peersRef = useRef<Map<string, Peer>>(new Map())
  const signalTimerRef = useRef<NodeJS.Timeout | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const roomRef = useRef<RoomInfo | null>(null)
  const currentUserIdRef = useRef<string | undefined>(currentUserId)

  // Keep refs in sync with state/props
  useEffect(() => { roomRef.current = room }, [room])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])

  // Derive the effective room ID from room state or fallback to prop
  const getEffectiveRoomId = useCallback(() => {
    return roomRef.current?.id ?? initialRoomId ?? ''
  }, [initialRoomId])

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      originalVideoTrackRef.current = stream.getVideoTracks()[0] || null
      setLocalStream(stream)
      return stream
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow permissions in your browser.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found.')
      } else {
        setError('Failed to access camera/microphone: ' + (err.message || 'Unknown error'))
      }
      return null
    }
  }, [])

  const replaceVideoTrackForAllPeers = useCallback((newTrack: MediaStreamTrack) => {
    for (const [, entry] of peersRef.current) {
      try {
        const senders = entry.peer?.senders || []
        const sender = entry.peer._pc?.getSenders?.()?.find((s: any) => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(newTrack)
      } catch {}
    }
  }, [])

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return
    const newState = !audioEnabled
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = newState })
    setAudioEnabled(newState)
  }, [audioEnabled])

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return
    if (isScreenSharing) return
    const newState = !videoEnabled
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = newState })
    setVideoEnabled(newState)
  }, [videoEnabled, isScreenSharing])

  const toggleScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return

    if (isScreenSharing) {
      if (originalVideoTrackRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0]
        if (oldTrack) localStreamRef.current.removeTrack(oldTrack)
        localStreamRef.current.addTrack(originalVideoTrackRef.current)
        replaceVideoTrackForAllPeers(originalVideoTrackRef.current)
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop())
        screenStreamRef.current = null
      }
      setIsScreenSharing(false)
      setVideoEnabled(true)
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = screenStream
        const screenTrack = screenStream.getVideoTracks()[0]
        const oldTrack = localStreamRef.current.getVideoTracks()[0]
        if (oldTrack) {
          if (!originalVideoTrackRef.current) originalVideoTrackRef.current = oldTrack
          localStreamRef.current.removeTrack(oldTrack)
        }
        localStreamRef.current.addTrack(screenTrack)
        replaceVideoTrackForAllPeers(screenTrack)
        setVideoEnabled(true)
        setIsScreenSharing(true)
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()))

        screenTrack.onended = () => {
          if (originalVideoTrackRef.current) {
            localStreamRef.current!.removeTrack(screenTrack)
            localStreamRef.current!.addTrack(originalVideoTrackRef.current)
            replaceVideoTrackForAllPeers(originalVideoTrackRef.current)
            setLocalStream(new MediaStream(localStreamRef.current!.getTracks()))
            originalVideoTrackRef.current = null
          }
          screenStreamRef.current = null
          setIsScreenSharing(false)
          setVideoEnabled(true)
        }
      } catch {
        // user cancelled screen share
      }
    }
  }, [isScreenSharing, replaceVideoTrackForAllPeers])

  const pollSignals = useCallback(async (since: number): Promise<number> => {
    const rid = getEffectiveRoomId()
    if (!rid) return since
    try {
      const res = await fetch(`/api/video/rooms/${rid}/signal?since=${since}`)
      if (!res.ok) return since
      const data = await res.json()
      for (const sig of data.signals as SignalData[]) {
        handleIncomingSignal(sig)
      }
      return data.now || since
    } catch {
      return since
    }
  }, [getEffectiveRoomId])

  const handleIncomingSignal = useCallback((sig: SignalData) => {
    const existing = peersRef.current.get(sig.fromUserId)
    if (!existing) return

    if (sig.type === 'offer') {
      existing.peer.signal(sig.data)
    } else if (sig.type === 'answer') {
      existing.peer.signal(sig.data)
    } else if (sig.type === 'ice') {
      existing.peer.signal(sig.data)
    }
  }, [])

  const sendSignal = useCallback(async (toUserId: string, type: string, data: any) => {
    const rid = getEffectiveRoomId()
    if (!rid) return
    try {
      await fetch(`/api/video/rooms/${rid}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, toUserId, data }),
      })
    } catch {}
  }, [getEffectiveRoomId])

  const createPeer = useCallback((userId: string, initiator: boolean, stream: MediaStream) => {
    const SimplePeer = require('simple-peer')
    const peer = new SimplePeer({ initiator, stream, config: STUN_SERVERS })

    const entry: Peer = { userId, peer, connected: false }
    peersRef.current.set(userId, entry)
    setPeers(Array.from(peersRef.current.values()))

    peer.on('signal', (data: any) => {
      const type = data.type === 'offer' ? 'offer' : data.type === 'answer' ? 'answer' : 'ice'
      sendSignal(userId, type, data)
    })

    peer.on('stream', (remoteStream: MediaStream) => {
      entry.stream = remoteStream
      setPeers(Array.from(peersRef.current.values()))
    })

    peer.on('connect', () => {
      entry.connected = true
      setPeers(Array.from(peersRef.current.values()))
    })

    peer.on('close', () => {
      peersRef.current.delete(userId)
      setPeers(Array.from(peersRef.current.values()))
    })

    peer.on('error', (err: Error) => {
      console.error('Peer error:', err)
    })

    return peer
  }, [sendSignal])

  const createRoom = useCallback(async (name?: string) => {
    try {
      const res = await fetch('/api/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create room')
      const data = await res.json()
      setRoom(data?.data?.room || data?.room)
      return data?.data?.room || data?.room
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }, [])

  const joinRoom = useCallback(async (inviteCode: string) => {
    try {
      const res = await fetch('/api/video/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })
      if (!res.ok) throw new Error('Failed to join room')
      const data = await res.json()
      setRoom(data?.data?.room || data?.room)
      return data?.data?.room || data?.room
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }, [])

  const fetchRoom = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/video/rooms/${roomId}`)
      if (!res.ok) throw new Error('Failed to fetch room')
      const data = await res.json()
      setRoom(data?.data?.room || data?.room)
      return data?.data?.room || data?.room
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }, [])

  const startCall = useCallback(async () => {
    const currentRoom = roomRef.current
    if (!currentRoom) {
      console.warn('startCall: no room available yet')
      return
    }
    setConnecting(true)
    setError('')

    const stream = await getLocalStream()
    if (!stream) {
      setConnecting(false)
      return
    }

    const uid = currentUserIdRef.current

    for (const p of currentRoom.participants) {
      if (p.userId === uid) continue
      if (peersRef.current.has(p.userId)) continue
      const isInitiator = uid === currentRoom.createdBy.id
      createPeer(p.userId, isInitiator, stream)
    }

    let since = Date.now()
    const poll = async () => {
      since = await pollSignals(since)
      signalTimerRef.current = setTimeout(poll, 1000)
    }
    poll()

    setConnecting(false)
  }, [getLocalStream, createPeer, pollSignals])

  const leaveRoom = useCallback(async () => {
    if (signalTimerRef.current) {
      clearTimeout(signalTimerRef.current)
      signalTimerRef.current = null
    }

    for (const [, entry] of peersRef.current) {
      entry.peer.destroy()
    }
    peersRef.current.clear()
    setPeers([])

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      originalVideoTrackRef.current = null
      setLocalStream(null)
    }

    setIsScreenSharing(false)
    setAudioEnabled(true)
    setVideoEnabled(true)

    const rid = getEffectiveRoomId()
    if (rid) {
      try {
        await fetch(`/api/video/rooms/${rid}`, { method: 'DELETE' })
      } catch {}
    }

    setRoom(null)
  }, [getEffectiveRoomId])

  useEffect(() => {
    return () => {
      if (signalTimerRef.current) clearTimeout(signalTimerRef.current)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return {
    room,
    localStream,
    peers,
    error,
    connecting,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    createRoom,
    joinRoom,
    fetchRoom,
    startCall,
    leaveRoom,
    setRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  }
}