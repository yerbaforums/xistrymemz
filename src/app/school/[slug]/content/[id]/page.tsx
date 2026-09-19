'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import EntityActions from '@/components/EntityActions'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import PinToBoardButton from '@/components/PinToBoardButton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface ContentData {
  id: string
  title: string
  content: string
  contentType: string
  images: string | null
  videoUrl: string | null
  price: number | null
  isPaid: boolean
  pinned: boolean
  createdAt: string
  contentSection: string | null
  sortOrder: number
  author: { id: string; name: string | null; image: string | null }
  user: { id: string; schoolName: string | null; schoolSlug: string | null; image: string | null }
  hashtags: { hashtag: { id: string; tag: string } }[]
  _count: { likes: number }
}

interface QuizQuestion {
  question: string
  options: string[]
  correct: string
}

const CONTENT_TYPE_ICONS: Record<string, string> = {
  article: '📄', lesson: '📖', note: '📝', guide: '🗺️', course: '🎓', resource: '📦', quiz: '📝'
}

function QuizSection({ content }: { content: string }) {
  const questions: QuizQuestion[] = content.split('\n').filter(Boolean).map(line => {
    const parts = line.split('|')
    return { question: parts[0], options: parts.slice(1, 5), correct: parts[5]?.trim() || '' }
  }).filter(q => q.question && q.options.length >= 2)

  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [, setShowResults] = useState(false)

  if (questions.length === 0) return <p>No quiz questions found.</p>

  const score = questions.filter((q, i) => answers[i] === q.correct).length

  return (
    <div className={styles.quizWrap}>
      <h3>Quiz: {questions.length} question{questions.length > 1 ? 's' : ''}</h3>
      {questions.map((q, i) => (
        <div key={i} className={`${styles.quizQuestion} ${submitted ? (answers[i] === q.correct ? styles.quizCorrect : styles.quizWrong) : ''}`}>
          <p className={styles.quizQText}>{i + 1}. {q.question}</p>
          <div className={styles.quizOptions}>
            {q.options.filter(Boolean).map((opt, j) => {
              const isSelected = answers[i] === opt
              const isRight = submitted && opt === q.correct
              const isWrong = submitted && isSelected && opt !== q.correct
              return (
                <button
                  key={j}
                  className={`${styles.quizOpt} ${isSelected ? styles.quizOptSelected : ''} ${isRight ? styles.quizOptCorrect : ''} ${isWrong ? styles.quizOptWrong : ''}`}
                  onClick={() => !submitted && setAnswers({ ...answers, [i]: opt })}
                  disabled={submitted}
                >
                  {opt}
                  {isRight && ' ✓'}
                  {isWrong && ' ✗'}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <button className={styles.quizSubmitBtn} onClick={() => { setSubmitted(true); setShowResults(true) }} disabled={Object.keys(answers).length < questions.length}>
          Submit ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      ) : (
        <div className={styles.quizResult}>
          Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
        </div>
      )}
    </div>
  )
}

export default function SchoolContentDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const slug = params.slug as string
  const id = params.id as string
  const [content, setContent] = useState<ContentData | null>(null)
  const [related, setRelated] = useState<ContentData[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [purchase, setPurchase] = useState<{ status: string } | null>(null)
  const [pendingPurchases, setPendingPurchases] = useState<{ id: string; user: { id: string; name: string | null; image: string | null }; amount: number }[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [buying, setBuying] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [approving, setApproving] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/school/${slug}/content/${id}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`/api/school/${slug}/content`).then(r => r.ok ? r.json() : [])
    ]).then(([data, all]) => {
      setContent(data)
      setRelated(all.filter((c: ContentData) => c.id !== data.id).slice(0, 4))
    }).catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [slug, id])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/school/${slug}/content/${id}/purchase`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const d = data?.data || data
        if (!d) return
        setPurchase(d.purchase || null)
        setIsOwner(!!d.isOwner)
        setPendingPurchases(d.pending || [])
      })
      .catch(() => {})
  }, [session, slug, id])

  const handleBuy = async () => {
    setBuying(true)
    try {
      const res = await fetch(`/api/school/${slug}/content/${id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txHash.trim() || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        const p = data?.data || data
        setPurchase(p)
        setTxHash('')
      }
    } catch { /* ignore */ } finally {
      setBuying(false)
    }
  }

  const handleApprove = async (purchaseId: string, action: 'approve' | 'cancel') => {
    setApproving(purchaseId)
    try {
      const res = await fetch(`/api/school/${slug}/content/${id}/purchase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, action }),
      })
      if (res.ok) setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId))
    } catch { /* ignore */ } finally {
      setApproving(null)
    }
  }

  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!session?.user?.id || !slug || !content?.id) return
    fetch(`/api/school/progress?schoolId=${content.user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const progress: Array<{ contentId: string; completed: boolean }> | null = data?.data?.progress || data?.progress || null
        if (progress) {
          const found = progress.find((p: { contentId?: string; completed?: boolean }) => p.contentId === content.id)
          if (found) setCompleted(found.completed)
        }
      })
      .catch(() => {})
  }, [session, slug, content?.id, content?.user?.id])

  if (loading) return <Skeleton width="100%" height="2rem" />
  if (fetchError) return <div className={styles.error}>Failed to load content</div>
  if (!content) return <div className={styles.error}>Content not found</div>

  const images: string[] = content.images ? JSON.parse(content.images) : []
  const isHtml = content.content.startsWith('<')

  const handleToggleComplete = async () => {
    if (!content?.id || completing) return
    setCompleting(true)
    try {
      const res = await fetch('/api/school/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: content.user.id, contentId: content.id, completed: !completed })
      })
      if (res.ok) setCompleted(!completed)
    } catch {}
    setCompleting(false)
  }
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
  const locked = !!content?.isPaid && !isOwner && purchase?.status !== 'COMPLETED'

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Schools', href: '/schools' },
        { label: content.user.schoolName || 'School', href: `/school/${slug}` },
        { label: content.title },
      ]} />

      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={styles.typeBadge}>{CONTENT_TYPE_ICONS[content.contentType] || '📄'} {content.contentType}</span>
          <span className={`badge ${content.isPaid ? 'badge-active' : 'badge-draft'}`}>
            {content.isPaid ? `$${content.price || 0}` : 'Free'}
          </span>
          {content.contentSection && <span className={styles.sectionBadge}>{content.contentSection}</span>}
        </div>
        <h1 className={styles.title}>{content.title}</h1>
        <div className={styles.meta}>
          <span>by {content.author.name || 'Unknown'}</span>
          <span>{new Date(content.createdAt).toLocaleDateString()}</span>
          <span>{Math.max(1, Math.round(content.content.replace(/<[^>]*>/g, '').split(/\s+/).length / 200))} min read</span>
        </div>
      </div>

      {locked ? (
        <div className={styles.body}>
          <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px dashed var(--border-color)' }}>
            <div style={{ fontSize: '2rem' }}>🔒</div>
            <h3>Premium content</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              This {content.contentType} costs <strong>${content.price || 0}</strong>. {purchase?.status === 'PENDING' ? 'Your request is pending approval — the full content unlocks once confirmed.' : 'Request access and the instructor will unlock it once your payment is confirmed.'}
            </p>
            {purchase?.status !== 'PENDING' && (
              <>
                <input
                  value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Transaction hash (optional)" aria-label="Transaction hash"
                  style={{ width: '100%', maxWidth: 360, padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 8 }}
                />
                <br />
                <button onClick={handleBuy} disabled={buying} style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  {buying ? 'Requesting...' : `🎓 Request access — $${content.price || 0}`}
                </button>
              </>
            )}
          </div>
        </div>
      ) : content.contentType === 'quiz' ? (
        <QuizSection content={content.content} />
      ) : (
        <div className={styles.body}>
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: content.content }} />
          ) : (
            content.content.split('\n').map((line, i) => <p key={i}>{line}</p>)
          )}
        </div>
      )}

      {isOwner && pendingPurchases.length > 0 && (
        <div className={styles.body} style={{ marginTop: 12 }}>
          <h3>🎟️ Pending access requests ({pendingPurchases.length})</h3>
          {pendingPurchases.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{p.user.name || 'Someone'} · ${p.amount}</span>
              <button onClick={() => handleApprove(p.id, 'approve')} disabled={approving === p.id} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer' }}>Approve</button>
              <button onClick={() => handleApprove(p.id, 'cancel')} disabled={approving === p.id} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {!locked && images.length > 0 && (
        <div className={styles.imageGrid}>
          {images.map((url, i) => (
            <div key={i} className={styles.imageWrap}>
              <img src={url} alt="" />
            </div>
          ))}
        </div>
      )}

      {!locked && content.videoUrl && (
        <div className={styles.videoWrap}>
          <video src={content.videoUrl} controls className={styles.video} />
        </div>
      )}

      {content.hashtags && content.hashtags.length > 0 && (
        <div className={styles.hashtagRow}>
          {content.hashtags.map((h) => (
            <Link key={h.hashtag.id} href={`/hashtag/${h.hashtag.tag}`} className={styles.hashtagPill}>
              #{h.hashtag.tag}
            </Link>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <EntityActions entityType="SCHOOLCONTENT" entityId={content.id} title={content.title} authorId={content.author.id} variant="bar" />
      </div>

      {session?.user && (
        <div className={styles.actions}>
          <PinToBoardButton
            entityType="SCHOOL_CONTENT"
            entityId={content.id}
            entityTitle={content.title}
            variant="ghost"
            label="Pin to Board"
          />
        </div>
      )}

      <Link href={`/school/${slug}`} className={styles.backLink}>← Back to {content.user.schoolName || 'School'}</Link>

      {related.length > 0 && (
        <div className={styles.related}>
          <h2 className={styles.relatedTitle}>More from {content.user.schoolName || 'this school'}</h2>
          <div className={styles.relatedGrid}>
            {related.map(item => (
              <Link key={item.id} href={`/school/${slug}/content/${item.id}`} className={styles.relatedCard}>
                <div className={styles.relatedBadge}>{CONTENT_TYPE_ICONS[item.contentType] || '📄'} {item.contentType}</div>
                <h3 className={styles.relatedName}>{item.title}</h3>
                <p className={styles.relatedPreview}>{stripHtml(item.content).slice(0, 80)}...</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {session?.user?.id && content && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button
            onClick={handleToggleComplete}
            disabled={completing}
            style={{ padding: '10px 24px', background: completed ? 'var(--accent-success)' : 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
          >
            {completing ? '...' : completed ? '✅ Completed' : '📝 Mark Complete'}
          </button>
        </div>
      )}
      <LinkedItemsSection entityType="SCHOOLCONTENT" entityId={content.id} currentUserId={session?.user?.id} />
    </div>
  )
}
