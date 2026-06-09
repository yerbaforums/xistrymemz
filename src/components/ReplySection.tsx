'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import EntityActions from '@/components/EntityActions'
import styles from './ReplySection.module.css'

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
  expandReply?: boolean
}

export default function ReplySection({ postId, postAuthorId, expandReply }: ReplySectionProps) {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [replies, setReplies] = useState<Reply[]>([])
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(false)
  const replyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (expandReply) {
      setExpanded(true)
      setTimeout(() => replyInputRef.current?.focus(), 100)
    }
  }, [expandReply])

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
    <div className={styles.wrapper}>
      {total > 0 && (
        <button type="button" onClick={() => setExpanded(!expanded)} className={styles.toggleBtn}>
          {expanded ? 'Hide replies' : `View ${total} ${total === 1 ? 'reply' : 'replies'}`}
        </button>
      )}

      {expanded && (
        <div className={styles.repliesContainer}>
          {loading && <div className={styles.loadingText}>Loading replies...</div>}
          {replies.map(reply => (
            <div key={reply.id} className={styles.reply}>
              <div className={styles.replyAvatar}>
                {reply.user.image ? (
                  <img src={reply.user.image} alt="" className={styles.replyAvatarImg} />
                ) : (
                  <div className={styles.replyAvatarPlaceholder}>
                    {reply.user.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className={styles.replyBody}>
                <div className={styles.replyHeader}>
                  <span className={styles.replyAuthor}>{reply.user.name || 'User'}</span>
                  <span className={styles.replyDate}>
                    {new Date(reply.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.replyContent}>{reply.content}</p>
                <EntityActions
                  entityType="POST"
                  entityId={reply.id}
                  title={reply.content?.slice(0, 80) || 'Reply'}
                  authorId={reply.user.id}
                  initialLikes={reply.likes || 0}
                  variant="compact"
                />
              </div>
            </div>
          ))}

          {session && (
            <form onSubmit={handleReply} className={styles.replyForm}>
              <input
                ref={replyInputRef}
                type="text"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                maxLength={2000}
                className={styles.replyInput}
              />
              <button type="submit" disabled={posting || !replyContent.trim()} className={styles.replyBtn}>
                {posting ? '...' : 'Reply'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
