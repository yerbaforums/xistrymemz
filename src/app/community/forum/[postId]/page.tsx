'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from '../../community.module.css'

interface Author {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Post {
  id: string
  title: string
  content: string
  pinned: boolean
  locked: boolean
  viewCount: number
  replyCount: number
  totalTips: number
  tippers: number
  createdAt: string
  updatedAt: string
  author: Author
  category: { id: string; name: string; slug: string }
}

interface Reply {
  id: string
  content: string
  totalTips: number
  tippers: number
  createdAt: string
  author: Author
}

export default function ForumThreadPage() {
  const params = useParams()
  const postId = params.postId as string
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session } = useSession()
  
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tipTarget, setTipTarget] = useState<{type: 'post' | 'reply', id: string, authorId: string} | null>(null)
  const [tipAmount, setTipAmount] = useState('')
  const [tipCrypto, setTipCrypto] = useState('USDT')
  const [cryptoBalances, setCryptoBalances] = useState<{symbol: string, name: string, available: number, icon: string, color: string}[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [editingPost, setEditingPost] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [editReplyContent, setEditReplyContent] = useState('')
  const [deleting, setDeleting] = useState(false)

  const userId = session?.user?.id
  const isAuthor = post && userId && post.author.id === userId

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
      const res = await fetch(`/api/forum/post/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editPostTitle, content: editPostContent })
      })
      if (res.ok) {
        const updated = await res.json()
        setPost({ ...post, ...updated })
        setEditingPost(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/forum/post/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/community/forum'
      }
    } catch (e) {
      console.error(e)
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
      const res = await fetch(`/api/forum/reply/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editReplyContent })
      })
      if (res.ok) {
        const updated = await res.json()
        setReplies(replies.map(r => r.id === replyId ? { ...r, content: updated.content } : r))
        setEditingReply(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/forum/reply/${replyId}`, { method: 'DELETE' })
      if (res.ok) {
        setReplies(replies.filter(r => r.id !== replyId))
        if (post) setPost({ ...post, replyCount: post.replyCount - 1 })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    fetchPost()
    fetchReplies()
    fetchTipOptions()
  }, [postId])

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/forum/post/${postId}`)
      if (res.ok) {
        const data = await res.json()
        setPost(data)
      }
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async () => {
    try {
      const res = await fetch(`/api/forum/replies?postId=${postId}`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data)
      }
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  const fetchTipOptions = async () => {
    try {
      const res = await fetch('/api/forum/tip-options')
      if (res.ok) {
        const data = await res.json()
        setCryptoBalances(data.cryptoBalances || [])
      }
    } catch (error) {
      console.error('Error fetching tip options:', error)
    }
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, postId })
      })
      if (res.ok) {
        setReplyContent('')
        fetchReplies()
        fetchPost()
      }
    } catch (error) {
      console.error('Error submitting reply:', error)
    } finally {
      setSubmitting(false)
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
        alert(`Tip sent! ${amount} ${tipCrypto} ($${data.amount?.toFixed(2)})`)
        setTipTarget(null)
        setTipAmount('')
        fetchPost()
        fetchReplies()
        fetchTipOptions()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send tip')
      }
    } catch (error) {
      console.error('Error sending tip:', error)
    }
  }

  if (loading) {
    return <div className={styles.container}><p>Loading...</p></div>
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
      <div className={styles.forumBreadcrumb}>
        <Link href="/community?tab=forum">← Forum</Link>
        <span> / </span>
        <Link href={`/community?tab=forum&category=${post.category.id}`}>{post.category.name}</Link>
      </div>

      <div className={styles.threadPost}>
        <div className={styles.threadHeader}>
          <span className={styles.threadCategory}>{post.category.name}</span>
          {post.pinned && <span className={styles.pinnedBadge}>📌 Pinned</span>}
          {post.locked && <span className={styles.lockedBadge}>🔒 Locked</span>}
          <h1>{post.title}</h1>
          <div className={styles.threadMeta}>
            <span>👁️ {post.viewCount} views</span>
            <span>💬 {post.replyCount} replies</span>
            {post.totalTips > 0 && <span>💰 ${post.totalTips.toFixed(2)} in tips</span>}
          </div>
        </div>

        <div className={styles.threadAuthor}>
          <div className={styles.authorAvatar}>
            {post.author.image ? (
              <img src={post.author.image} alt={post.author.name || 'User'} />
            ) : (
              <span>{post.author.name?.[0] || post.author.email[0].toUpperCase()}</span>
            )}
          </div>
          <div className={styles.authorInfo}>
            <Link href={`/profile/${post.author.id}`} className={styles.authorName}>
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
                <button onClick={() => setEditingPost(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleSaveEdit} className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            post.content
          )}
        </div>

        <div className={styles.threadActions}>
          <button
            onClick={() => {
              const newLiked = new Set(likedPosts)
              if (newLiked.has(post.id)) newLiked.delete(post.id)
              else newLiked.add(post.id)
              setLikedPosts(newLiked)
            }}
            className={`${styles.actionBtn} ${likedPosts.has(post.id) ? styles.liked : ''}`}
          >
            {likedPosts.has(post.id) ? '❤️ Liked' : '🤍 Like'}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/community/forum/${post.id}`)}
            className={styles.actionBtn}
          >
            📤 Share
          </button>
          <button
            onClick={() => setTipTarget({ type: 'post', id: post.id, authorId: post.author.id })}
            className={styles.actionBtn}
          >
            💰 Tip
          </button>
          {isAuthor && !editingPost && (
            <>
              <button onClick={handleEditPost} className={styles.actionBtn}>
                ✏️ Edit
              </button>
              <button onClick={handleDeletePost} className={styles.actionBtn} disabled={deleting}>
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.repliesSection}>
        <h2>Replies ({replies.length})</h2>
        
        {replies.length === 0 ? (
          <div className={styles.noReplies}>
            <p>No replies yet. Be the first to respond!</p>
          </div>
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
                    <Link href={`/profile/${reply.author.id}`} className={styles.authorName}>
                      {reply.author.name || 'Anonymous'}
                    </Link>
                    <span className={styles.replyDate}>
                      {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
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
                        <button onClick={() => setEditingReply(null)} className="btn-ghost">Cancel</button>
                        <button onClick={() => handleSaveReplyEdit(reply.id)} className="btn-primary" disabled={submitting}>
                          {submitting ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    reply.content
                  )}
                </div>
                
                <div className={styles.replyActions}>
                  {reply.totalTips > 0 && (
                    <span className={styles.replyTips}>💰 ${reply.totalTips.toFixed(2)}</span>
                  )}
                  <button
                    onClick={() => setTipTarget({ type: 'reply', id: reply.id, authorId: reply.author.id })}
                    className={styles.actionBtn}
                  >
                    💰 Tip
                  </button>
                  {userId && reply.author.id === userId && (
                    <>
                      <button onClick={() => handleEditReply(reply)} className={styles.actionBtn}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDeleteReply(reply.id)} className={styles.actionBtn}>
                        🗑️
                      </button>
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
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Write your reply..."
          rows={5}
          className={styles.replyTextarea}
        />
        <button
          onClick={handleSubmitReply}
          disabled={submitting || !replyContent.trim()}
          className={styles.submitReplyBtn}
        >
          {submitting ? 'Posting...' : 'Post Reply'}
        </button>
      </div>

      {tipTarget && (
        <div className={styles.tipModal}>
          <div className={styles.tipModalContent}>
            <h3>Send Tip</h3>
            
            <div className={styles.cryptoSelect}>
              <label>Select Crypto</label>
              <div className={styles.cryptoGrid}>
                {cryptoBalances.map(crypto => (
                  <button
                    key={crypto.symbol}
                    className={`${styles.cryptoBtn} ${tipCrypto === crypto.symbol ? styles.selected : ''}`}
                    onClick={() => setTipCrypto(crypto.symbol)}
                    style={{ '--crypto-color': crypto.color } as React.CSSProperties}
                  >
                    <img src={crypto.icon} alt={crypto.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    <span>{crypto.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.balanceInfo}>
              <span>Available: {cryptoBalances.find(c => c.symbol === tipCrypto)?.available?.toFixed(4) || '0'} {tipCrypto}</span>
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
              <button onClick={handleTip} className={styles.confirmTipBtn}>
                Confirm Tip
              </button>
              <button onClick={() => { setTipTarget(null); setTipAmount(''); }} className={styles.cancelTipBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}