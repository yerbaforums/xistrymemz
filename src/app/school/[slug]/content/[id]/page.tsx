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
  const [showResults, setShowResults] = useState(false)

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

  if (loading) return <Skeleton width="100%" height="2rem" />
  if (fetchError) return <div className={styles.error}>Failed to load content</div>
  if (!content) return <div className={styles.error}>Content not found</div>

  const images: string[] = content.images ? JSON.parse(content.images) : []
  const isHtml = content.content.startsWith('<')
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!session?.user?.id || !slug || !content?.id) return
    fetch(`/api/school/progress?schoolId=${content.user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const progress = data?.data?.progress || data?.progress
        if (progress) {
          const found = progress.find((p: any) => p.contentId === content.id)
          if (found) setCompleted(found.completed)
        }
      })
      .catch(() => {})
  }, [session, slug, content?.id, content?.user?.id])

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

  return (
    <div className={styles.page}>
      <nav className="breadcrumbs">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/schools" className="breadcrumb-link">Schools</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href={`/school/${slug}`} className="breadcrumb-link">{content.user.schoolName || 'School'}</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">{content.title}</span>
      </nav>

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

      {content.contentType === 'quiz' ? (
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

      {images.length > 0 && (
        <div className={styles.imageGrid}>
          {images.map((url, i) => (
            <div key={i} className={styles.imageWrap}>
              <img src={url} alt="" />
            </div>
          ))}
        </div>
      )}

      {content.videoUrl && (
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
