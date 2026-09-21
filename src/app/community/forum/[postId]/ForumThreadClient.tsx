'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import MentionInput, { type MentionInputHandle } from '@/components/MentionInput'
import HashtagText from '@/components/HashtagText'
import StarButton from '@/components/StarButton'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import styles from '../../community.module.css'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'
import TranslateButton from '@/components/TranslateButton'
import MediaPlayer from '@/components/MediaPlayer'
import LinkPreview, { URL_REGEX } from '@/components/LinkPreview'
import ShareBar from '@/components/ShareBar'
import EntityActions from '@/components/EntityActions'
import ImageUploader from '@/components/ImageUploader'
import { normalizeVideoUrl, normalizeAudioUrl, POST_VIDEO_KINDS, GENERAL_AUDIO_KINDS } from '@/lib/media-links'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Author {
  id: string
  name: string | null
  username: string | null
  email: string
  image: string | null
  shopSlug: string | null
}

interface Post {
  id: string
  title: string
  content: string
  postType: string
  status: string
  score: number
  myVote?: number
  pinned: boolean
  locked: boolean
  isPoll: boolean
  pollType: string
  pollEndsAt?: string | null
  viewCount: number
  replyCount: number
  totalTips: number
  tippers: number
  createdAt: string
  updatedAt: string
  author: Author
  category: { id: string; name: string; slug: string }
  pollOptions?: { id: string; optionText: string; voteCount: number; sortOrder: number }[]
}

interface Reply {
  id: string
  content: string
  images: string | null
  side: string
  score: number
  myVote?: number
  totalTips: number
  tippers: number
  createdAt: string
  author: Author
}

interface PollOption {
  id: string
  optionText: string
  voteCount: number
  sortOrder: number
  percentage?: number
}

export default function ForumThreadPage() {
  const params = useParams()
  const postId = params.postId as string
  const router = useRouter()
  const { data: session } = useSession()
  const { success, error } = useToast()
  
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [tipTarget, setTipTarget] = useState<{type: 'post' | 'reply', id: string, authorId: string} | null>(null)
  const [tipAmount, setTipAmount] = useState('')
  const [tipCrypto, setTipCrypto] = useState('XMR')
  const [tipOptions, setTipOptions] = useState<{symbol: string, name: string, icon: string, color: string}[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [editingPost, setEditingPost] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [editReplyContent, setEditReplyContent] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const replyMentionRef = useRef<MentionInputHandle>(null)
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [userVoted, setUserVoted] = useState(false)
  const [userVotes, setUserVotes] = useState<string[]>([])
  const [voting, setVoting] = useState(false)
  const [replyVotingId, setReplyVotingId] = useState<string | null>(null)
  const [isPollExpired, setIsPollExpired] = useState(false)
  const [pollEndsAt, setPollEndsAt] = useState<string | null>(null)
  const [replySide, setReplySide] = useState('NEUTRAL')
  const [sideFilter, setSideFilter] = useState('')
  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<'SPAM' | 'ABUSE' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER'>('SPAM')
  const [reportDescription, setReportDescription] = useState('')
  const [reporting, setReporting] = useState(false)

  const userId = session?.user?.id
  const userRole = (session?.user as { role?: string })?.role
  const isAuthor = post && userId && post.author.id === userId
  const isAdmin = userRole === 'ADMIN'
  const canModerate = isAuthor || isAdmin

  const handleTogglePin = async () => {
    if (!post || !isAdmin) return
    try {
      const res = await fetch(`/api/forum/post/${post?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !post.pinned })
      })
      if (res.ok) {
        setPost({ ...post, pinned: !post.pinned })
      }
    } catch {
    }
  }

  const handleToggleLock = async () => {
    if (!post || !isAdmin) return
    try {
      const res = await fetch(`/api/forum/post/${post?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: !post.locked })
      })
      if (res.ok) {
        setPost({ ...post, locked: !post.locked })
      }
    } catch {
    }
  }

  const handleEditPost = () => {
    if (!post) return
    setEditPostTitle(post.title)
    setEditPostContent(post.content)
    setEditingPost(true)
  }

  const handleSaveEdit = async () => {
    if (!editPostTitle.trim() || !editPostContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/forum/post/${post?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editPostTitle, content: editPostContent })
      })
      if (res.ok) {
        const updated = (await res.json())?.data
        setPost({ ...post, ...updated })
        setEditingPost(false)
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/forum/post/${deleteTarget}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/community/forum')
      }
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  const handleEditReply = (reply: Reply) => {
    setEditingReply(reply.id)
    setEditReplyContent(reply.content)
  }

  const handleSaveReplyEdit = async (replyId: string) => {
    if (!editReplyContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/forum/reply/${replyDeleteTarget}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editReplyContent })
      })
      if (res.ok) {
        const updated = (await res.json())?.data
        setReplies(replies.map(r => r.id === replyId ? { ...r, content: updated.content } : r))
        setEditingReply(null)
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const [replyDeleteTarget, setReplyDeleteTarget] = useState<string | null>(null)

  const handleDeleteReply = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/forum/reply/${replyDeleteTarget}`, { method: 'DELETE' })
      if (res.ok) {
        setReplies(replies.filter(r => r.id !== replyDeleteTarget))
        if (post) setPost({ ...post, replyCount: post.replyCount - 1 })
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    fetchPost()
    fetchReplies()
    fetchTipOptions()
  }, [postId])

  useEffect(() => {
    if (post && !loading) fetchReplies()
  }, [sideFilter])

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/forum/post/${postId}`)
      if (res.ok) {
        const data = await res.json()
        const p = data?.data || data
        setPost(p)
        if (p.pollEndsAt) {
          setPollEndsAt(p.pollEndsAt)
          setIsPollExpired(new Date(p.pollEndsAt) < new Date())
        }
        if (p.isPoll && p.pollOptions) {
          const total = p.pollOptions.reduce((sum: number, o: { voteCount: number }) => sum + o.voteCount, 0)
          setTotalVotes(total)
          setPollOptions(p.pollOptions.map((o: { id: string; optionText: string; voteCount: number; sortOrder: number }) => ({
            ...o,
            percentage: total > 0 ? Math.round((o.voteCount / total) * 100) : 0
          })))
        }
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async () => {
    try {
      const base = `/api/forum/replies?postId=${postId}`
      const url = sideFilter ? `${base}&side=${sideFilter}` : base
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setReplies(data?.data || data || [])
      }
    } catch {
    }
  }

  const handlePostVote = async (value: number) => {
    if (!post || !session?.user?.id) return
    const current = post.myVote || 0
    const finalValue = current === value ? 0 : value
    try {
      const res = await fetch('/api/forum/vote', {
        method: finalValue === 0 ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, value: finalValue })
      })
      if (res.ok) {
        const data = await res.json()
        setPost({
          ...post,
          score: data?.data?.score ?? (post.score || 0),
          myVote: finalValue
        })
      } else {
        const data = await res.json()
        error(data.error || 'Failed to vote')
      }
    } catch {
      error('Failed to vote')
    }
  }

  const handleReplyVote = async (replyId: string, value: number) => {
    if (!session?.user?.id) return
    const target = replies.find(r => r.id === replyId)
    if (!target) return
    const current = target.myVote || 0
    const finalValue = current === value ? 0 : value
    setReplyVotingId(replyId)
    try {
      const res = await fetch('/api/forum/reply-vote', {
        method: finalValue === 0 ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId, value: finalValue })
      })
      if (res.ok) {
        const data = await res.json()
        setReplies(prev => prev.map(r => r.id === replyId ? {
          ...r,
          score: data?.data?.score ?? (r.score || 0),
          myVote: finalValue
        } : r))
      } else {
        const data = await res.json()
        error(data.error || 'Failed to vote')
      }
    } catch {
      error('Failed to vote')
    } finally {
      setReplyVotingId(null)
    }
  }

  const handleSubmitReport = async () => {
    if (!reportTarget) return
    setReporting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'FORUMPOST',
          entityId: reportTarget,
          reason: reportReason,
          description: reportDescription || undefined,
        })
      })
      if (res.ok) {
        success('Report submitted. our team will review it.');
        setReportTarget(null)
        setReportDescription('')
        setReportReason('SPAM')
      } else {
        const data = await res.json()
        error(data.error || 'Failed to submit report')
      }
    } catch {
      error('Failed to submit report')
    } finally {
      setReporting(false)
    }
  }

  const fetchTipOptions = async () => {
    try {
      const res = await fetch('/api/forum/tip-options')
      if (res.ok) {
        const data = await res.json()
        setTipOptions(data.tipOptions || [])
      }
    } catch {
    }
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { content: replyContent, postId, images: replyImages.length > 0 ? replyImages : undefined }
      if (post?.postType === 'DEBATE') {
        body.side = replySide
      }
      const res = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setReplyContent('')
        setReplyImages([])
        setReplySide('NEUTRAL')
        fetchReplies()
        fetchPost()
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (optionId: string) => {
    if (!session || userVoted) return
    setVoting(true)
    try {
      const res = await fetch('/api/forum/poll/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, optionId })
      })
      if (res.ok) {
        const data = await res.json()
        setPollOptions(data.pollOptions || [])
        setTotalVotes(prev => prev + 1)
        setUserVoted(true)
        setUserVotes([optionId])
      }
    } catch {
    } finally {
      setVoting(false)
    }
  }

  const handleTip = async () => {
    if (!tipAmount || !tipTarget) return
    const amount = parseFloat(tipAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      const res = await fetch('/api/forum/tip-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: tipTarget.type === 'post' ? tipTarget.id : undefined,
          replyId: tipTarget.type === 'reply' ? tipTarget.id : undefined,
          amount,
          cryptoSymbol: tipCrypto
        })
      })
      if (res.ok) {
        const data = await res.json()
        success(`Tip sent! ${amount} ${tipCrypto} ($${data.amount?.toFixed(2)})`)
        setTipTarget(null)
        setTipAmount('')
        fetchPost()
        fetchReplies()
        fetchTipOptions()
      } else {
        const data = await res.json()
        error(data.error || 'Failed to send tip')
      }
    } catch {
    }
  }

  if (loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  if (!post) {
    return (
      <div className={styles.container}>
        <p>Post not found</p>
        <Link href="/community?tab=forum">← Back to Forum</Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Community', href: '/community' },
        { label: 'Forum', href: '/community/forum' },
        { label: post.title || 'Post' },
      ]} />

      <div className={styles.threadPost}>
        <div className={styles.threadHeader}>
          <span className={styles.threadCategory}>{post.category.name}</span>
          {post.postType === 'IDEA' && <span className={styles.ideaBadge}>💡 Idea</span>}
          {post.postType === 'DEBATE' && <span className={styles.debateBadge}>⚖️ Debate</span>}
          {post.status && post.status !== 'NONE' && <span className={styles[`status_${post.status}`]}>{post.status.replace('_', ' ')}</span>}
          {post.pinned && <span className={styles.pinnedBadge}>📌 Pinned</span>}
          {post.locked && <span className={styles.lockedBadge}>🔒 Locked</span>}
          <h1>{post.title}</h1>
          <div className={styles.threadMeta}>
            <span>👁️ {post.viewCount} views</span>
            <span>💬 {post.replyCount} replies</span>
            <span>⬆️ {post.score || 0} votes</span>
            {post.totalTips > 0 && <span>💰 ${post.totalTips.toFixed(2)} in tips</span>}
          </div>
        </div>

        <div className={styles.voteSide}>
          <button
            onClick={() => handlePostVote(1)}
            className={`${styles.voteCtrl} ${post.myVote === 1 ? styles.voteUp : ''}`}
            aria-label="Upvote post"
          >
            ▲
          </button>
          <span className={styles.voteScore}>{post.score || 0}</span>
          <button
            onClick={() => handlePostVote(-1)}
            className={`${styles.voteCtrl} ${post.myVote === -1 ? styles.voteDown : ''}`}
            aria-label="Downvote post"
          >
            ▼
          </button>
        </div>

        <div className={styles.threadAuthor}>
          <div className={styles.authorAvatar}>
            {post.author.image ? (
              <Image src={post.author.image} alt={post.author.name || 'User'} width={40} height={40} />
            ) : (
              <span>{post.author.name?.[0] || 'A'}</span>
            )}
          </div>
          <div className={styles.authorInfo}>
            <Link href={getUserProfileUrl(post.author)} className={styles.authorName}>
              {post.author.name || 'Anonymous'}
            </Link>
            <span className={styles.postDate}>
              Posted {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className={styles.threadContent}>
          {editingPost ? (
            <div className={styles.editForm}>
              <input
                type="text"
                value={editPostTitle}
                onChange={e => setEditPostTitle(e.target.value)}
                className={styles.editTitle}
              />
              <textarea
                value={editPostContent}
                onChange={e => setEditPostContent(e.target.value)}
                rows={8}
                className={styles.editContent}
              />
              <div className={styles.editActions}>
                <Button onClick={() => setEditingPost(false)} variant="ghost">Cancel</Button>
                <Button onClick={handleSaveEdit} variant="primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div><HashtagText text={post.content} mentionLinks /></div>
              <TranslateButton text={post.content} />
              <LinkPreview text={post.content} />
              {(() => {
                const found = (post.content.match(URL_REGEX) || []).find((u: string) => {
                  const v = normalizeVideoUrl(u)
                  if (v && POST_VIDEO_KINDS.includes(v.kind)) return true
                  const a = normalizeAudioUrl(u)
                  return !!a && GENERAL_AUDIO_KINDS.includes(a.kind)
                })
                return found ? (
                  <div style={{ marginTop: 10 }}>
                    <MediaPlayer url={found} />
                  </div>
                ) : null
              })()}
            </>
          )}
        </div>

        {post.isPoll && (
          <div className={styles.pollSection}>
            <div className={styles.pollHeader}>
              <span className={styles.pollTitle}>📊 Poll</span>
              <span className={styles.pollVotes}>{totalVotes} votes</span>
              {pollEndsAt && (
                <span className={isPollExpired ? styles.pollExpired : styles.pollActive}>
                  {isPollExpired ? 'Ended' : `Ends ${new Date(pollEndsAt).toLocaleDateString()}`}
                </span>
              )}
            </div>
            <div className={styles.pollOptions}>
              {pollOptions.map(option => (
                <Button
                  key={option.id}
                  variant="ghost"
                  onClick={() => handleVote(option.id)}
                  disabled={voting || userVoted || isPollExpired}
                  className={`${styles.pollOptionBtn} ${userVotes.includes(option.id) ? styles.votedOption : ''}`}
                >
                  <div className={styles.pollOptionBar}>
                    <div 
                      className={styles.pollOptionFill}
                      style={{ width: `${option.percentage || 0}%` }}
                    />
                  </div>
                  <span className={styles.pollOptionText}>{option.optionText}</span>
                  <span className={styles.pollOptionPercent}>{option.percentage || 0}%</span>
                </Button>
              ))}
            </div>
            {session && !userVoted && !isPollExpired && (
              <p className={styles.pollHint}>Click an option to vote</p>
            )}
            {userVoted && (
              <p className={styles.pollThanks}>You voted!</p>
            )}
          </div>
        )}

        <div className={styles.threadActions}>
          <Button
            variant="ghost"
            onClick={() => {
              const newLiked = new Set(likedPosts)
              if (newLiked.has(post.id)) newLiked.delete(post.id)
              else newLiked.add(post.id)
              setLikedPosts(newLiked)
            }}
            className={`${styles.actionBtn} ${likedPosts.has(post.id) ? styles.liked : ''}`}
          >
            {likedPosts.has(post.id) ? '❤️ Liked' : '🤍 Like'}
          </Button>
          {session && (
            <StarButton itemType="FORUM_POST" itemId={post.id} className={styles.actionBtn} title="Star this discussion" />
          )}
          <Button
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/community/forum/${post.id}`)}
            className={styles.actionBtn}
          >
            📤 Share
          </Button>
          <ShareBar entityType="FORUMPOST" title={post.title} description={post.content?.slice(0, 140)} variant="compact" />
          <EntityActions
            entityType="FORUMPOST"
            entityId={post.id}
            title={post.title}
            authorId={post.author.id}
            variant="bar"
          />
          <Button
            variant="ghost"
            onClick={() => setTipTarget({ type: 'post', id: post.id, authorId: post.author.id })}
            className={styles.actionBtn}
          >
            💰 Tip
          </Button>
          {canModerate && !editingPost && (
            <>
              <Button variant="ghost" onClick={handleEditPost} className={styles.actionBtn}>
                ✏️ Edit
              </Button>
              <Button variant="ghost" onClick={() => setDeleteTarget(post?.id)} className={styles.actionBtn} disabled={deleting}>
                🗑️ Delete
              </Button>
            </>
          )}
          {isAdmin && (
            <>
              <Button variant="ghost" onClick={handleTogglePin} className={styles.actionBtn}>
                {post.pinned ? '📌 Unpin' : '📌 Pin'}
              </Button>
              <Button variant="ghost" onClick={handleToggleLock} className={styles.actionBtn}>
                {post.locked ? '🔓 Unlock' : '🔒 Lock'}
              </Button>
            </>
          )}
          {!canModerate && (
            <Button variant="ghost" onClick={() => setReportTarget(post.id)} className={styles.actionBtn}>
              🚩 Report
            </Button>
          )}
        </div>
      </div>

      <LinkedItemsSection entityType="FORUMPOST" entityId={post.id} currentUserId={userId} />

      <div className={styles.repliesSection}>
        <h2>
          Replies ({replies.length})
          {post.postType === 'DEBATE' && (
            <span className={styles.sideFilter}>
              <select value={sideFilter} onChange={e => setSideFilter(e.target.value)}>
                <option value="">All sides</option>
                <option value="PRO">PRO</option>
                <option value="CON">CON</option>
                <option value="NEUTRAL">NEUTRAL</option>
              </select>
            </span>
          )}
        </h2>

        {post.postType === 'DEBATE' && replies.length > 0 && (
          <div className={styles.consensusBox}>
            {(() => {
              const votes = replies.reduce((acc: Record<string, number>, r) => ({
                ...acc,
                [r.side]: (acc[r.side] || 0) + 1
              }), {})
              return `⚖️ ${(votes.PRO || 0)} arguing PRO · ${(votes.CON || 0)} arguing CON · ${(votes.NEUTRAL || 0)} neutral`
            })()}
          </div>
        )}
        
        {replies.length === 0 ? (
          <EmptyState icon="💬" title="No replies yet" description="Be the first to respond!" action={session?.user ? { label: 'Post Reply', onClick: () => document.querySelector('[class*="replyForm"]')?.scrollIntoView({ behavior: 'smooth' }) } : undefined} />
        ) : (
          <div className={styles.repliesList}>
            {replies.map((reply, index) => (
              <div key={reply.id} className={styles.replyCard}>
                <div className={styles.replyHeader}>
                  <span className={styles.replyNumber}>#{index + 1}</span>
                  <div className={styles.replyAuthor}>
                    <div className={styles.authorAvatar}>
                      {reply.author.image ? (
                        <img src={reply.author.image} alt={reply.author.name || 'User'} />
                      ) : (
                        <span>{reply.author.name?.[0] || reply.author.email[0].toUpperCase()}</span>
                      )}
                    </div>
                    <Link href={getUserProfileUrl(reply.author)} className={styles.authorName}>
                      {reply.author.name || 'Anonymous'}
                    </Link>
                    <span className={styles.replyDate}>
                      {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                    {post.postType === 'DEBATE' && reply.side && (
                      <span className={`${styles.sideBadge} ${styles[`side_${reply.side}`]}`}>{reply.side}</span>
                    )}
                  </div>
                </div>
                
                <div className={styles.replyContent}>
                  {editingReply === reply.id ? (
                    <div className={styles.editForm}>
                      <textarea
                        value={editReplyContent}
                        onChange={e => setEditReplyContent(e.target.value)}
                        rows={4}
                        className={styles.editContent}
                      />
                      <div className={styles.editActions}>
                        <Button onClick={() => setEditingReply(null)} variant="ghost">Cancel</Button>
                        <Button onClick={() => handleSaveReplyEdit(reply.id)} variant="primary" disabled={submitting}>
                          {submitting ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div><HashtagText text={reply.content} mentionLinks /></div>
                      <TranslateButton text={reply.content} />
                      {(() => {
                        try {
                          const arr = JSON.parse(reply.images || 'null')
                          if (!Array.isArray(arr) || arr.length === 0) return null
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: arr.length === 1 ? '1fr' : '1fr 1fr', gap: 6, marginTop: 8 }}>
                              {arr.filter((u): u is string => typeof u === 'string').map((url, i) => (
                                <div key={i} style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: arr.length === 1 ? '16/9' : '1' }}>
                                  <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ))}
                            </div>
                          )
                        } catch {
                          return null
                        }
                      })()}
                    </>
                  )}
                </div>
                
                <div className={styles.replyActions}>
                  <div className={styles.replyVotes}>
                    <button
                      onClick={() => handleReplyVote(reply.id, 1)}
                      disabled={replyVotingId === reply.id}
                      className={`${styles.replyVoteBtn} ${reply.myVote === 1 ? styles.voteUp : ''}`}
                      aria-label="Upvote reply"
                    >
                      ▲
                    </button>
                    <span className={styles.replyScore}>{reply.score || 0}</span>
                    <button
                      onClick={() => handleReplyVote(reply.id, -1)}
                      disabled={replyVotingId === reply.id}
                      className={`${styles.replyVoteBtn} ${reply.myVote === -1 ? styles.voteDown : ''}`}
                      aria-label="Downvote reply"
                    >
                      ▼
                    </button>
                  </div>
                  {reply.totalTips > 0 && (
                    <span className={styles.replyTips}>💰 ${reply.totalTips.toFixed(2)}</span>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setTipTarget({ type: 'reply', id: reply.id, authorId: reply.author.id })}
                    className={styles.actionBtn}
                  >
                    💰 Tip
                  </Button>
                  {userId && reply.author.id === userId && (
                    <>
                      <Button variant="ghost" onClick={() => handleEditReply(reply)} className={styles.actionBtn}>
                        ✏️ Edit
                      </Button>
                      <Button variant="ghost" onClick={() => setReplyDeleteTarget(reply.id)} className={styles.actionBtn}>
                        🗑️
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.replyForm}>
        <h3>Post a Reply</h3>
        {post.postType === 'DEBATE' && (
          <div className={styles.sideSelect}>
            <span className={styles.sideSelectLabel}>Your stance:</span>
            {(['PRO', 'CON', 'NEUTRAL'] as const).map(s => (
              <label key={s} className={styles.sideSelectOption}>
                <input
                  type="radio"
                  name="replySide"
                  value={s}
                  checked={replySide === s}
                  onChange={() => setReplySide(s)}
                />
                {s === 'PRO' ? '✅ For' : s === 'CON' ? '⛔ Against' : '🤔 Neutral'}
              </label>
            ))}
          </div>
        )}
        <div className={styles.mentionInputWrapper}>
          <MentionInput
            ref={replyMentionRef}
            value={replyContent}
            onChange={setReplyContent}
            placeholder="Write your reply..."
            rows={5}
            className={styles.replyTextarea}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => replyMentionRef.current?.insertAtCursor('@')}
            className={styles.mentionBtn}
            title="Mention someone"
          >
            @
          </Button>
        </div>
        <div style={{ margin: '8px 0' }}>
          <ImageUploader images={replyImages} onChange={setReplyImages} maxImages={3} />
        </div>
        <Button
          variant="primary"
          onClick={handleSubmitReply}
          disabled={submitting || !replyContent.trim()}
          className={styles.submitReplyBtn}
        >
          {submitting ? 'Posting...' : 'Post Reply'}
        </Button>
      </div>

      {tipTarget && (
        <div className={styles.tipModal}>
          <div className={styles.tipModalContent}>
            <h3>Send Tip</h3>
            
            <div className={styles.cryptoSelect}>
              <label>Select Private Money</label>
              <div className={styles.cryptoGrid}>
                {tipOptions.map(crypto => (
                  <Button
                    key={crypto.symbol}
                    variant="secondary"
                    className={`${styles.cryptoBtn} ${tipCrypto === crypto.symbol ? styles.selected : ''}`}
                    onClick={() => setTipCrypto(crypto.symbol)}
                    style={{ '--crypto-color': crypto.color } as React.CSSProperties}
                  >
                    <img src={crypto.icon} alt={crypto.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    <span>{crypto.symbol}</span>
                  </Button>
                ))}
              </div>
            </div>

            <input
              type="number"
              placeholder="Amount"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className={styles.tipInput}
              min="0.01"
              step="0.01"
            />

            <div className={styles.tipActions}>
              <Button variant="primary" onClick={handleTip} className={styles.confirmTipBtn}>
                Confirm Tip
              </Button>
              <Button variant="ghost" onClick={() => { setTipTarget(null); setTipAmount(''); }} className={styles.cancelTipBtn}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {reportTarget && (
        <div className={styles.tipModal}>
          <div className={styles.tipModalContent}>
            <h3>Report Post</h3>
            <p className={styles.reportHint}>Help keep the community safe and respectful.</p>

            <label className={styles.reportLabel}>Reason</label>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value as 'SPAM' | 'ABUSE' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER')}
              className={styles.reportSelect}
            >
              <option value="SPAM">Spam</option>
              <option value="ABUSE">Abuse</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="INAPPROPRIATE">Inappropriate content</option>
              <option value="OTHER">Other</option>
            </select>

            <textarea
              placeholder="Add details (optional)"
              value={reportDescription}
              onChange={e => setReportDescription(e.target.value)}
              className={styles.reportTextarea}
              rows={3}
              maxLength={1000}
            />

            <div className={styles.tipActions}>
              <Button variant="danger" onClick={handleSubmitReport} disabled={reporting} className={styles.confirmTipBtn}>
                {reporting ? 'Submitting...' : 'Submit Report'}
              </Button>
              <Button variant="ghost" onClick={() => { setReportTarget(null); setReportDescription(''); setReportReason('SPAM') }} className={styles.cancelTipBtn}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}


      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePost}
        title="Delete Post"
        message="Delete this post? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={!!replyDeleteTarget}
        onClose={() => setReplyDeleteTarget(null)}
        onConfirm={handleDeleteReply}
        title="Delete Reply"
        message="Delete this reply? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}