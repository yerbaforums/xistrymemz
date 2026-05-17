'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useToast } from '@/context/ToastContext'
import TipModal from './TipModal'

interface PostActionsProps {
  postId: string
  postAuthorId: string
  initialLikes: number
  liked?: boolean
  replyCount?: number
  onLike?: (postId: string, liked: boolean) => void
  onTip?: (postId: string) => void
  onReply?: () => void
  showTip?: boolean
}

export default function PostActions({ postId, postAuthorId, initialLikes, liked: initialLiked, replyCount, onLike, onTip, onReply, showTip = true }: PostActionsProps) {
  const { data: session } = useSession()
  const { settings } = useSiteSettings()
  const { success, error: toastError } = useToast()
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(initialLiked || false)
  const [tipping, setTipping] = useState(false)
  const [liking, setLiking] = useState(false)
  const [tipTarget, setTipTarget] = useState<{ postId: string } | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const walletEnabled = settings?.enableWallet !== false
  const isOwner = session?.user?.id === postAuthorId

  const handleLike = async () => {
    if (!session || liking) return
    setLiking(true)
    const newLiked = !liked
    const previousLikes = likes
    setLiked(newLiked)
    setLikes(l => newLiked ? l + 1 : l - 1)
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: newLiked })
      })
      if (!res.ok) throw new Error()
    } catch {
      setLiked(!newLiked)
      setLikes(previousLikes)
      toastError('Failed to like')
    } finally {
      setLiking(false)
    }
  }

  const handleTip = async (amount: number, cryptoSymbol: string) => {
    if (!session) return
    const res = await fetch('/api/posts/tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, amount, cryptoSymbol })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Tip failed')
    }
    success(`Tipped ${amount} ${cryptoSymbol}!`)
    onTip?.(postId)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/profile?post=${postId}`
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied!')
    } catch {
      toastError('Failed to copy')
    }
    setShowShareMenu(false)
  }

  const handleBookmark = async () => {
    if (!session) return
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type: 'POST' })
      })
      if (res.ok) {
        success('Post saved!')
      } else {
        toastError('Failed to save')
      }
    } catch {
      toastError('Failed to save')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleLike} disabled={!session || liking}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border-color)', background: liked ? 'var(--bg-hover)' : 'transparent',
            cursor: !session || liking ? 'not-allowed' : 'pointer', color: liked ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontSize: '0.8rem', transition: 'all 0.2s', opacity: !session ? 0.5 : 1
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{likes}</span>
        </button>

        {onReply && (
          <button type="button" onClick={onReply}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border-color)', background: 'transparent',
              cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem', transition: 'all 0.2s'
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{replyCount ?? 0}</span>
          </button>
        )}

        {showTip && walletEnabled && !isOwner && (
          <button type="button" onClick={() => setTipTarget({ postId })}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border-color)', background: 'transparent',
              cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem', transition: 'all 0.2s'
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
            <span>Tip</span>
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowShareMenu(!showShareMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border-color)', background: 'transparent',
              cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem', transition: 'all 0.2s'
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          {showShareMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 140
            }}>
              <button type="button" onClick={handleShare}
                style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}>
                Copy Link
              </button>
              <button type="button" onClick={handleBookmark}
                style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}>
                Bookmark
              </button>
            </div>
          )}
        </div>
      </div>

      <TipModal
        isOpen={tipTarget !== null}
        onClose={() => setTipTarget(null)}
        onTip={handleTip}
      />
    </>
  )
}
