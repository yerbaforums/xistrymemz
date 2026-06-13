'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import styles from './project-updates.module.css'

interface UpdateUser { id: string; name: string | null; image: string | null }

interface ProjectUpdate {
  id: string; content: string; imageUrl: string | null; images: string | null
  createdAt: string; userId: string
  user: UpdateUser
  _count: { likesRelation: number; comments: number }
}

interface Props {
  projectId: string
  isOwner: boolean
  isEditor?: boolean
}

export default function ProjectUpdates({ projectId, isOwner, isEditor }: Props) {
  const { data: session } = useSession()
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  const canPost = isOwner || isEditor

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/updates`)
      if (res.ok) { const d = await res.json(); setUpdates(d?.data || d || []) }
    } catch {}
  }, [projectId])

  useEffect(() => { fetchUpdates() }, [fetchUpdates])

  const handleUploadImage = async (file: File) => {
    setUploadingImg(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setUploadedImages(prev => [...prev, data.url || data.data?.url])
      }
    } catch {} finally { setUploadingImg(false) }
  }

  const handlePost = async () => {
    if (!content.trim()) return
    setPosting(true)
    try {
      const images = uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : null
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, images })
      })
      if (res.ok) { setContent(''); setUploadedImages([]); fetchUpdates() }
    } finally { setPosting(false) }
  }

  const handleLike = async (updateId: string) => {
    const res = await fetch(`/api/projects/${projectId}/updates/${updateId}/like`, { method: 'POST' })
    if (res.ok) { const data = await res.json(); const liked = data?.data?.liked ?? data?.liked; setLikedIds(prev => { const n = new Set(prev); liked ? n.add(updateId) : n.delete(updateId); return n }); fetchUpdates() }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/projects/${projectId}/updates/${deleteTarget}`, { method: 'DELETE' })
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
        <span className={styles.updateCount}>{updates.length} update{updates.length !== 1 ? 's' : ''}</span>
      </div>

      {canPost && (
        <div className={styles.postBox}>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Post a project update..." rows={3}
            className={styles.textarea} />
          <div className={styles.imageUploadSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(f) }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImg} className={styles.addImageBtn}>
              {uploadingImg ? 'Uploading...' : '📷 Add Image'}
            </button>
            {uploadedImages.length > 0 && (
              <span className={styles.imgCountLabel}>{uploadedImages.length} image(s) selected</span>
            )}
          </div>
          <div className={styles.postActions}>
            <button onClick={handlePost} disabled={!content.trim() || posting}
              className={styles.postBtn}>
              {posting ? 'Posting...' : 'Post Update →'}
            </button>
          </div>
        </div>
      )}

      {updates.length === 0 && (
        <EmptyState icon="📡" title="No updates yet" description={canPost ? 'Post the first update to share your progress.' : 'Check back later for project updates.'} action={canPost ? { label: 'Post Update', onClick: () => setContent(' ') } : undefined}
 />
      )}

      <div className={styles.updatesList}>
        {updates.map(update => {
          const images = parseImages(update.images)
          const liked = likedIds.has(update.id)
          return (
            <div key={update.id} className={styles.updateCard}>
              <div className={styles.updateHeader}>
                <div className={styles.flexRow}>
                  {update.user.image ? <img src={update.user.image} alt="" className={styles.userAvatar} />
                    : <div className={styles.avatarFallback}>{(update.user.name || 'U')[0]}</div>}
                  <strong className={styles.userName}>{update.user.name || 'User'}</strong>
                  <span className={styles.timeAgo}>{formatTime(update.createdAt)}</span>
                </div>
                {canPost && <button onClick={() => setDeleteTarget(update.id)} className={styles.deleteBtn}>✕</button>}
              </div>

              <div className={styles.updateContent}>{update.content}</div>

              {images.length > 0 && (
                <div className={styles.imageGrid} style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 1fr)` }}>
                  {images.map((url, i) => <img key={i} src={url} alt="" className={styles.imageGridImg} />)}
                </div>
              )}
              {update.imageUrl && !update.images && (
                <img src={update.imageUrl} alt="" className={styles.legacyImage} />
              )}

              <div className={styles.actionBar}>
                <button onClick={() => handleLike(update.id)} className={`${styles.actionBtn} ${liked ? styles.likeBtn + ' ' + styles.liked : styles.likeBtn}`}>
                  {liked ? '❤️' : '🤍'} {update._count.likesRelation}
                </button>
                <button onClick={() => setExpandedComments(prev => { const n = new Set(prev); n.has(update.id) ? n.delete(update.id) : n.add(update.id); return n })} className={`${styles.actionBtn} ${styles.commentBtn}`}>
                  💬 {update._count.comments}
                </button>
              </div>

              {expandedComments.has(update.id) && (
                <div className={styles.commentsSection}>
                  <CommentsList updateId={update.id} projectId={projectId} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Update"
        message="Delete this update permanently?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

function CommentsList({ updateId, projectId }: { updateId: string; projectId: string }) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/updates/${updateId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setComments(data?.data || data || []))
      .catch(() => {})
  }, [projectId, updateId])

  const postComment = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/updates/${updateId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      if (res.ok) { setText(''); const data = await res.json(); setComments(prev => [...prev, data?.data || data]) }
    } finally { setPosting(false) }
  }

  return (
    <div>
      {comments.map(c => (
        <div key={c.id} className={styles.commentItem}>
          <strong className={styles.commentAuthor}>{c.user?.name || 'User'}:</strong>
          <span>{c.content}</span>
        </div>
      ))}
      {session?.user && (
        <div className={styles.commentForm}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." className={styles.commentInput} />
          <button onClick={postComment} disabled={!text.trim() || posting} className={styles.commentPostBtn}>Post</button>
        </div>
      )}
    </div>
  )
}
