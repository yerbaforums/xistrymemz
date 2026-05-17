'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import PostActions from './PostActions'

interface Reply {
  id: string
  content: string
  likes: number
  createdAt: string
  user: { id: string; name: string | null; image: string | null; username: string | null }
}

interface ReplySectionProps {
  postId: string
  postAuthorId: string
}

export default function ReplySection({ postId, postAuthorId }: ReplySectionProps) {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [replies, setReplies] = useState<Reply[]>([])
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchReplies = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/${postId}/replies`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data.replies || [])
        setTotal(data.total || 0)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded && replies.length === 0) fetchReplies()
  }, [expanded, postId])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || posting || !replyContent.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), parentId: postId })
      })
      if (res.ok) {
        success('Reply posted!')
        setReplyContent('')
        fetchReplies()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to reply')
      }
    } catch {
      toastError('Failed to reply')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {total > 0 && (
        <button type="button" onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent', border: 'none', color: 'var(--accent-primary)',
            cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0'
          }}>
          {expanded ? 'Hide replies' : `View ${total} ${total === 1 ? 'reply' : 'replies'}`}
        </button>
      )}

      {expanded && (
        <div style={{ marginTop: 8 }}>
          {loading && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '8px 0' }}>Loading replies...</div>}
          {replies.map(reply => (
            <div key={reply.id} style={{
              display: 'flex', gap: 8, padding: '8px 0',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: 'var(--bg-tertiary)'
              }}>
                {reply.user.image ? (
                  <img src={reply.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                    {reply.user.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{reply.user.name || 'User'}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(reply.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{reply.content}</p>
                <PostActions
                  postId={reply.id}
                  postAuthorId={reply.user.id}
                  initialLikes={reply.likes}
                  showTip={false}
                />
              </div>
            </div>
          ))}

          {session && (
            <form onSubmit={handleReply} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="text"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                maxLength={2000}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem'
                }}
              />
              <button type="submit" disabled={posting || !replyContent.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)',
                  color: '#fff', cursor: posting ? 'not-allowed' : 'pointer', opacity: posting || !replyContent.trim() ? 0.6 : 1
                }}>
                {posting ? '...' : 'Reply'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
