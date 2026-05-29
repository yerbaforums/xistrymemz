'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useEntityActions, type ActionEntityType } from '@/hooks/useEntityActions'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useToast } from '@/context/ToastContext'
import styles from './EntityActions.module.css'

interface EntityActionsProps {
  entityType: ActionEntityType
  entityId: string
  title: string
  authorId: string
  description?: string
  image?: string | null
  initialLikes?: number
  liked?: boolean
  saved?: boolean
  viewCount?: number
  replyCount?: number
  variant?: 'bar' | 'compact' | 'full' | 'modal-trigger'
  onEdit?: () => void
}

const SOCIAL_PLATFORMS = [
  { key: 'x', label: 'X', url: 'https://twitter.com/intent/tweet' },
  { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/sharer/sharer.php' },
  { key: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/sharing/share-offsite/' },
  { key: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/submit' },
  { key: 'telegram', label: 'Telegram', url: 'https://t.me/share/url' },
  { key: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/' },
  { key: 'mastodon', label: 'Mastodon', url: 'https://s2f.kytta.dev/' },
  { key: 'email', label: 'Email', url: 'mailto:' },
]

export default function EntityActions({
  entityType, entityId, title, authorId, description, image,
  initialLikes, liked: initLiked, saved: initSaved,
  viewCount: initViewCount, replyCount: initReplyCount,
  variant = 'bar', onEdit,
}: EntityActionsProps) {
  const { data: session } = useSession()
  const { settings } = useSiteSettings()
  const { success, error } = useToast()
  const {
    likes, liked, toggleLike,
    saved, toggleSave,
    viewCount, replyCount, replies, showReplies, toggleReplies, addReply,
    authorSettings,
  } = useEntityActions({
    entityType, entityId, authorId,
    initialLikes, liked: initLiked, saved: initSaved,
    viewCount: initViewCount, replyCount: initReplyCount,
  })

  const [showShareModal, setShowShareModal] = useState(false)
  const [showFeedModal, setShowFeedModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [feedContent, setFeedContent] = useState('')
  const [feedDestination, setFeedDestination] = useState<'PROFILE' | 'SHOP' | 'SCHOOL'>('PROFILE')
  const [posting, setPosting] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  const isOwner = session?.user?.id === authorId
  const walletEnabled = settings?.enableWallet !== false
  const hasShop = !!(session?.user as any)?.shopSlug
  const hasSchool = !!(session?.user as any)?.schoolSlug
  const canLike = authorSettings?.enableLikes !== false
  const canReply = authorSettings?.enableReplies !== false
  const canTip = authorSettings?.enableTips !== false && walletEnabled && !isOwner
  const showViews = authorSettings?.showViewCount !== false

  const url = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied!')
    } catch {
      error('Failed to copy')
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return }
    try {
      await navigator.share({ title, text: description || title, url })
    } catch { /* user cancelled */ }
  }

  const handleShareToFeed = async () => {
    if (!session || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: feedContent.trim() || `Shared a ${entityType.toLowerCase()}`,
          context: feedDestination,
          referenceType: entityType,
          referenceId: entityId,
          referenceTitle: title,
        }),
      })
      if (res.ok) {
        success('Posted!')
        setFeedContent('')
        setShowFeedModal(false)
        setShowShareModal(false)
      } else {
        const err = await res.json()
        error(err.error || 'Failed to post')
      }
    } catch {
      error('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || replying) return
    setReplying(true)
    const ok = await addReply(replyText)
    if (ok) setReplyText('')
    setReplying(false)
  }

  const btnClass = `${styles.btn} ${variant === 'compact' ? styles.btnCompact : variant === 'full' ? styles.btnFull : ''}`

  const modals = (
    <>
      {showTipModal && (
        <div className={styles.overlay} onClick={() => setShowTipModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>💎 Send Tip</h3>
            <p className={styles.modalDesc}>Support this content with a crypto tip</p>
            <div className={styles.tipRow}>
              {['XTM', 'XMR', 'BTC', 'ETH', 'USDT'].map(coin => (
                <button key={coin} className={styles.tipBtn} onClick={() => {
                  fetch('/api/actions/tip', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entityType, entityId, amount: 1, currency: coin }),
                  }).then(r => { if (r.ok) { success(`Tipped 1 ${coin}!`); setShowTipModal(false) } else error('Tip failed') })
                }}>{coin}</button>
              ))}
            </div>
            <button className={styles.closeBtn} onClick={() => setShowTipModal(false)}>Cancel</button>
          </div>
        </div>
      )}
      {showShareModal && (
        <div className={styles.overlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Share</h3>
              <button onClick={() => setShowShareModal(false)} className={styles.xBtn}>×</button>
            </div>
            <div className={styles.preview}>
              {image && <img src={image} alt="" className={styles.previewImg} />}
              <div>
                <div className={styles.previewType}>{entityType}</div>
                <div className={styles.previewTitle}>{title}</div>
              </div>
            </div>
            <div className={styles.copyRow}>
              <input type="text" readOnly value={url} className={styles.copyInput} />
              <button onClick={copyLink} className={styles.copyBtn}>Copy</button>
            </div>
            <button onClick={nativeShare} className={styles.nativeBtn}>📤 Share via device</button>
            <div className={styles.socialGrid}>
              {SOCIAL_PLATFORMS.map(p => (
                <a key={p.key} href={`${p.url}?${p.key === 'x' ? `text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` : p.key === 'facebook' ? `u=${encodeURIComponent(url)}` : p.key === 'linkedin' ? `url=${encodeURIComponent(url)}` : p.key === 'reddit' ? `url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` : p.key === 'telegram' ? `url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` : p.key === 'whatsapp' ? `text=${encodeURIComponent(title + ' ' + url)}` : p.key === 'mastodon' ? `text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` : `subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}`} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>{p.label}</a>
              ))}
            </div>
            <div className={styles.divider} />
            <button onClick={() => setShowFeedModal(true)} className={styles.feedBtn}>📝 Share to Feed</button>
          </div>
        </div>
      )}
      {showFeedModal && (
        <div className={styles.overlay} onClick={() => setShowFeedModal(false)} style={{ zIndex: 1001 }}>
          <div className={styles.feedModal} onClick={e => e.stopPropagation()}>
            <h4 className={styles.feedTitle}>Share to Post</h4>
            <textarea value={feedContent} onChange={e => setFeedContent(e.target.value)} placeholder="Add a comment (optional)..." rows={3} className={styles.feedTextarea} />
            <div className={styles.destRow}>
              {(['PROFILE', 'SHOP', 'SCHOOL'] as const).map(d => {
                const disabled = (d === 'SHOP' && !hasShop) || (d === 'SCHOOL' && !hasSchool)
                return <button key={d} disabled={disabled} onClick={() => setFeedDestination(d)} className={`${styles.destBtn} ${feedDestination === d ? styles.destActive : ''}`}>{d === 'PROFILE' ? 'My Profile' : d === 'SHOP' ? 'My Shop' : 'My School'}</button>
              })}
            </div>
            <div className={styles.feedActions}>
              <button onClick={() => setShowFeedModal(false)} className={styles.cancelBtn}>Cancel</button>
              <button onClick={handleShareToFeed} disabled={posting} className={styles.shareBtn}>{posting ? 'Posting...' : 'Share'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (variant === 'modal-trigger') {
    return (
      <>
        <button onClick={() => setShowShareModal(true)} className={styles.triggerBtn} title="Share">🔗</button>
        {modals}
      </>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        {canLike && (
          <button onClick={toggleLike} disabled={!session} className={`${btnClass} ${liked ? styles.active : ''}`} aria-label={liked ? 'Unlike' : 'Like'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>{likes}</span>
          </button>
        )}

        {session && (
          <button onClick={toggleSave} className={`${btnClass} ${saved ? styles.active : ''}`} aria-label={saved ? 'Remove bookmark' : 'Bookmark'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
        )}

        {canReply && (
          <button onClick={toggleReplies} className={btnClass} aria-label="Reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>{replyCount}</span>
          </button>
        )}

        {canTip && (
          <button onClick={() => setShowTipModal(true)} className={btnClass} aria-label="Tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span>Tip</span>
          </button>
        )}

        {showViews && viewCount > 0 && (
          <span className={styles.viewLabel}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {viewCount}
          </span>
        )}

        <div className={styles.spacer} />

        <button onClick={copyLink} className={`${styles.btn} ${styles.btnIcon}`} title="Copy link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>

        <button onClick={() => setShowShareModal(true)} className={`${styles.btn} ${styles.btnIcon}`} title="Share">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>

        <div className={styles.moreWrap}>
          <button onClick={() => setShowMore(!showMore)} className={`${styles.btn} ${styles.btnIcon}`} title="More">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          {showMore && (
            <div className={styles.moreMenu}>
              <div className={styles.moreOverlay} onClick={() => setShowMore(false)} />
              {isOwner && onEdit && (
                <button onClick={() => { onEdit(); setShowMore(false) }} className={styles.menuItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
              )}
              <button onClick={() => { copyLink(); setShowMore(false) }} className={styles.menuItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Link
              </button>
              <button onClick={() => { setShowShareModal(true); setShowMore(false) }} className={styles.menuItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16h16"/><polyline points="20 10 12 18 4 10"/></svg>
                Share to...
              </button>
              <button onClick={() => { setShowFeedModal(true); setShowMore(false) }} className={styles.menuItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Share to Feed
              </button>
            </div>
          )}
        </div>
      </div>

      {showReplies && canReply && (
        <div className={styles.replySection}>
          {replies.map(reply => (
            <div key={reply.id} className={styles.reply}>
              <div className={styles.replyAvatar}>
                {reply.user?.image ? <img src={reply.user.image} alt="" /> : <span>{reply.user?.name?.[0] || 'U'}</span>}
              </div>
              <div>
                <div className={styles.replyAuthor}>{reply.user?.name || 'Unknown'}</div>
                <div className={styles.replyContent}>{reply.content}</div>
              </div>
            </div>
          ))}
          {session && (
            <div className={styles.replyForm}>
              <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." className={styles.replyInput} onKeyDown={e => e.key === 'Enter' && handleReply()} />
              <button onClick={handleReply} disabled={!replyText.trim() || replying} className={styles.replyBtn}>{replying ? '...' : 'Reply'}</button>
            </div>
          )}
        </div>
      )}

      {modals}
    </div>
  )
}
