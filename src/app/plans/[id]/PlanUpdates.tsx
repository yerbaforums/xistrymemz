'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import styles from './sortable.module.css'

interface UpdateUser { id: string; name: string | null; image: string | null }

interface PlanUpdate {
  id: string; content: string; imageUrl: string | null; images: string | null
  createdAt: string; userId: string
  user: UpdateUser
  _count: { likesRelation: number; comments: number }
}

interface Props {
  planId: string
  isOwner: boolean
}

export default function PlanUpdates({ planId, isOwner }: Props) {
  const { data: session } = useSession()
  const [updates, setUpdates] = useState<PlanUpdate[]>([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [commentText, setCommentText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/updates`)
      if (res.ok) { const d = await res.json(); setUpdates(d?.data || d || []) }
    } catch {}
  }, [planId])

  useEffect(() => { fetchUpdates() }, [fetchUpdates])

  const handlePost = async () => {
    if (!content.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/plans/${planId}/updates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) { setContent(''); fetchUpdates() }
    } finally { setPosting(false) }
  }

  const handleLike = async (updateId: string) => {
    const res = await fetch(`/api/plans/${planId}/updates/${updateId}/like`, { method: 'POST' })
    if (res.ok) { const data = await res.json(); const liked = data?.data?.liked ?? data?.liked; setLikedIds(prev => { const n = new Set(prev); liked ? n.add(updateId) : n.delete(updateId); return n }); fetchUpdates() }
  }

  const handleDeleteConfirm = async () => {
    
    if (!deleteTarget) return;
    const res = await fetch(`/api/plans/${planId}/updates/${deleteTarget}`, { method: 'DELETE' })
    setDeleteTarget(null)
    if (res.ok) fetchUpdates()
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return d.toLocaleDateString()
  }

  const parseImages = (raw: string | null): string[] => {
    if (!raw) return []
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }

  return (
    <div>
      <div className={styles.header}>
        <h3>Project Timeline</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{updates.length} update{updates.length !== 1 ? 's' : ''}</span>
      </div>

      {isOwner && (
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Post a project update..." rows={3}
            style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', marginBottom: '8px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handlePost} disabled={!content.trim() || posting}
              style={{ padding: '8px 20px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: !content.trim() || posting ? 0.6 : 1 }}>
              {posting ? 'Posting...' : 'Post Update →'}
            </button>
          </div>
        </div>
      )}

      {updates.length === 0 && (
        <EmptyState icon="📡" title="No updates yet" description={isOwner ? 'Post the first update to share your progress.' : 'Check back later for project updates.'} action={isOwner ? { label: 'Post Update', onClick: () => setContent(' ') } : undefined} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {updates.map(update => {
          const images = parseImages(update.images)
          const liked = likedIds.has(update.id)
          return (
            <div key={update.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div className={styles.flexRow}>
                  {update.user.image ? <img src={update.user.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{(update.user.name || 'U')[0]}</div>}
                  <strong className={styles.small}>{update.user.name || 'User'}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(update.createdAt)}</span>
                </div>
                {isOwner && <button onClick={() => setDeleteTarget(update.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>}
              </div>

              <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: images.length > 0 ? '12px' : 0 }}>{update.content}</div>

              {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 1fr)`, gap: '8px', marginBottom: '12px' }}>
                  {images.map((url, i) => <img key={i} src={url} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />)}
                </div>
              )}
              {update.imageUrl && !update.images && (
                <img src={update.imageUrl} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
              )}

              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <button onClick={() => handleLike(update.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: liked ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {liked ? '❤️' : '🤍'} {update._count.likesRelation}
                </button>
                <button onClick={() => setExpandedComments(prev => { const n = new Set(prev); n.has(update.id) ? n.delete(update.id) : n.add(update.id); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  💬 {update._count.comments}
                </button>
              </div>

              {expandedComments.has(update.id) && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <CommentsList updateId={update.id} planId={planId} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CommentsList({ updateId, planId }: { updateId: string; planId: string }) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetch(`/api/plans/${planId}/updates/${updateId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(setComments)
      .catch(() => {})
  }, [planId, updateId])

  const postComment = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/plans/${planId}/updates/${updateId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      if (res.ok) { setText(''); const data = await res.json(); setComments(prev => [...prev, data]) }
    } finally { setPosting(false) }
  }

  return (
    <div>
      {comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: '6px', padding: '4px 0', fontSize: '0.8rem' }}>
          <strong>{c.user?.name || 'User'}:</strong>
          <span>{c.content}</span>
        </div>
      ))}
      {session?.user && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
          <button onClick={postComment} disabled={!text.trim() || posting} style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>Post</button>
        </div>
      )}
    </div>
  )
}
