'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useToast } from '@/context/ToastContext'
import TipModal from './TipModal'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
}

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

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
  border: '1px solid var(--border-color)', background: 'transparent',
  cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem',
  transition: 'all 0.15s ease',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  userSelect: 'none',
}

const activeStyle: React.CSSProperties = {
  transform: 'scale(0.92)',
}

export default function PostActions({ postId, postAuthorId, initialLikes, liked: initialLiked, replyCount, onLike, onTip, onReply, showTip = true }: PostActionsProps) {
  const { data: session } = useSession()
  const { settings } = useSiteSettings()
  const { success, error: toastError } = useToast()
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(initialLiked || false)
  const [tipping, setTipping] = useState(false)
  const [liking, setLiking] = useState(false)
  const [reposting, setReposting] = useState(false)
  const [tipTarget, setTipTarget] = useState<{ postId: string } | null>(null)
  const [showExtra, setShowExtra] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [donationAddresses, setDonationAddresses] = useState<DonationAddr[]>([])

  const walletEnabled = settings?.enableWallet !== false
  const isOwner = session?.user?.id === postAuthorId

  const handleLike = async () => {
    if (!session || liking) return
    setLiking(true)
    const newLiked = !liked
    const previousLikes = likes
    setLiked(newLiked)
    setLikes(l => newLiked ? l + 1 : l - 1)
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 300)
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

  const handleRepost = async () => {
    if (!session || reposting) return
    setReposting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          context: 'PROFILE',
          referenceType: 'POST',
          referenceId: postId,
        })
      })
      if (res.ok) {
        success('Post shared to your profile!')
      } else {
        const err = await res.json()
        toastError(err.error || 'Failed to repost')
      }
    } catch {
      toastError('Failed to repost')
    } finally {
      setReposting(false)
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
  }

  const handleBookmark = async () => {
    if (!session) return
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'POST', itemId: postId })
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
        <button
          type="button"
          onClick={handleLike}
          disabled={!session || liking}
          style={{
            ...btnStyle,
            background: liked ? 'var(--bg-hover)' : 'transparent',
            cursor: !session || liking ? 'not-allowed' : 'pointer',
            color: liked ? 'var(--accent-primary)' : 'var(--text-secondary)',
            opacity: !session ? 0.5 : 1,
            transform: likeAnim ? 'scale(1.2)' : 'scale(1)',
          }}
          onMouseDown={e => { if (session) (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)' }}
          onMouseUp={e => { if (session) (e.currentTarget as HTMLElement).style.transform = likeAnim ? 'scale(1.2)' : 'scale(1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ transition: 'transform 0.15s' }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{likes}</span>
        </button>

        {onReply && (
          <button
            type="button"
            onClick={onReply}
            style={btnStyle}
            onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)'}
            onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
            aria-label="Reply"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{replyCount ?? 0}</span>
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowExtra(!showExtra) }}
            style={btnStyle}
            aria-label="More actions"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {showExtra && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 140,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setShowExtra(false)} />
              {session && (
                <button type="button" onClick={() => { handleRepost(); setShowExtra(false) }} disabled={reposting}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Repost
                </button>
              )}
              {showTip && walletEnabled && !isOwner && (
                <button type="button" onClick={() => {
                  setShowExtra(false)
                  fetch(`/api/users/donations?userId=${postAuthorId}`)
                    .then(r => r.json())
                    .then(data => setDonationAddresses(data.addresses || []))
                    .catch(() => setDonationAddresses([]))
                  setTipTarget({ postId })
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', transition: 'background 0.15s', borderTop: session ? '1px solid var(--border-color)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  Tip
                </button>
              )}
              <button type="button" onClick={() => { handleShare(); setShowExtra(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', transition: 'background 0.15s', borderTop: (showTip && walletEnabled && !isOwner) || session ? '1px solid var(--border-color)' : 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Copy Link
              </button>
              <button type="button" onClick={() => { handleBookmark(); setShowExtra(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', transition: 'background 0.15s', borderTop: '1px solid var(--border-color)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
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
        donationAddresses={donationAddresses}
      />
    </>
  )
}
