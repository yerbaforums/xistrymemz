'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchApi } from '@/lib/fetch-api'

export type ActionEntityType =
  | 'POST' | 'PRODUCT' | 'SERVICE' | 'EVENT' | 'PROJECT'
  | 'REQUEST' | 'SCHOOLCONTENT' | 'GROUP' | 'SHOP' | 'SCHOOL'
  | 'FORUMPOST' | 'PROFILE'

interface AuthorSettings {
  enableTips: boolean
  enableReplies: boolean
  enableLikes: boolean
  showViewCount: boolean
}

interface UseEntityActionsOptions {
  entityType: ActionEntityType
  entityId: string
  authorId?: string
  initialLikes?: number
  liked?: boolean
  saved?: boolean
  viewCount?: number
  replyCount?: number
}

export function useEntityActions({
  entityType,
  entityId,
  authorId,
  initialLikes = 0,
  liked: initialLiked = false,
  saved: initialSaved = false,
  viewCount: initialViewCount = 0,
  replyCount: initialReplyCount = 0,
}: UseEntityActionsOptions) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(initialLiked)
  const [saved, setSaved] = useState(initialSaved)
  const [viewCount, setViewCount] = useState(initialViewCount)
  const [replyCount, setReplyCount] = useState(initialReplyCount)
  const [replies, setReplies] = useState<any[]>([])
  const [showReplies, setShowReplies] = useState(false)
  const [authorSettings, setAuthorSettings] = useState<AuthorSettings | null>(null)
  const [tipTotal, setTipTotal] = useState(0)
  const [liking, setLiking] = useState(false)
  const [saving, setSaving] = useState(false)
  const viewRecorded = useRef(false)

  const loadCounts = useCallback(async () => {
    const params = new URLSearchParams({ entityType, entityId })
    if (authorId) params.set('authorId', authorId)
    try {
      const res = await fetch(`/api/actions/counts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLikes(data.likeCount)
        setLiked(data.liked)
        setSaved(data.saved)
        setViewCount(data.viewCount)
        setReplyCount(data.replyCount)
        setTipTotal(data.tipTotal)
        if (data.authorSettings) setAuthorSettings(data.authorSettings)
      }
    } catch { /* ignore */ }
  }, [entityType, entityId, authorId])

  useEffect(() => { loadCounts() }, [loadCounts])

  useEffect(() => {
    if (!entityId || viewRecorded.current) return
    viewRecorded.current = true
    fetch('/api/actions/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId }),
    }).catch(() => {})
  }, [entityType, entityId])

  const toggleLike = useCallback(async () => {
    if (liking) return
    setLiking(true)
    const newLiked = !liked
    setLiked(newLiked)
    setLikes(l => newLiked ? l + 1 : l - 1)
    try {
      const res = await fetch('/api/actions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, liked: newLiked }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLikes(data.likeCount)
    } catch {
      setLiked(!newLiked)
      setLikes(l => newLiked ? l - 1 : l + 1)
    } finally {
      setLiking(false)
    }
  }, [liking, liked, entityType, entityId])

  const toggleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      if (saved) {
        const res = await fetch('/api/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType: entityType, itemId: entityId }),
        })
        if (res.ok) setSaved(false)
      } else {
        const res = await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType: entityType, itemId: entityId }),
        })
        if (res.ok) setSaved(true)
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }, [saving, saved, entityType, entityId])

  const addReply = useCallback(async (content: string) => {
    try {
      const { reply } = await fetchApi<any>('/api/actions/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, content }),
      })
      setReplies(r => [...r, reply])
      setReplyCount(c => c + 1)
      return true
    } catch { return false }
  }, [entityType, entityId])

  const loadReplies = useCallback(async () => {
    try {
      const { replies } = await fetchApi<any>(`/api/actions/replies?entityType=${entityType}&entityId=${entityId}`)
      setReplies(replies || [])
    } catch {}
  }, [entityType, entityId])

  const toggleReplies = useCallback(() => {
    setShowReplies(s => {
      if (!s) loadReplies()
      return !s
    })
  }, [loadReplies])

  return {
    likes, liked, toggleLike,
    saved, toggleSave,
    viewCount,
    replyCount, replies, showReplies, toggleReplies, addReply,
    tipTotal,
    authorSettings,
    reloadCounts: loadCounts,
  }
}
