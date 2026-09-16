'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/context/ToastContext'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import Loading from '@/components/Loading'

interface Sponsorship {
  id: string
  entityType: string
  entityId: string
  entityTitle?: string | null
  entitySlug?: string | null
  amount: number
  currency: string
  status: string
  nextReminderAt: string
  lastCompletedAt: string | null
  skipCount: number
  sponsor?: { id: string; name: string | null; image: string | null }
  lifetimeReceived?: number
}

function SponsorshipsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: toastError } = useToast()
  const [view, setView] = useState(searchParams.get('view') === 'incoming' ? 'incoming' : 'mine')
  const [items, setItems] = useState<Sponsorship[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] = useState<Sponsorship | null>(null)
  const [txHash, setTxHash] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  const fetchData = useCallback(async (v: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sponsorships?view=${v}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data?.data?.items || data?.items || [])
        setTotals(data?.data?.totals || data?.totals || {})
      }
    } catch { /* empty state covers */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchData(view)
  }, [status, view, fetchData])

  const switchView = (v: string) => {
    setView(v)
    router.replace(`/dashboard/sponsorships?view=${v}`, { scroll: false })
  }

  const act = async (id: string, action: 'complete' | 'skip' | 'pause' | 'resume' | 'cancel', body?: Record<string, string>) => {
    setActing(id)
    try {
      let url = `/api/sponsorships/${id}`
      let options: RequestInit = { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) }
      if (action === 'complete') {
        url = `/api/sponsorships/${id}/complete`
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }
      } else if (action === 'skip') {
        url = `/api/sponsorships/${id}/skip`
        options = { method: 'POST' }
      } else if (action === 'pause') {
        options = { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PAUSED' }) }
      } else if (action === 'resume') {
        options = { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ACTIVE' }) }
      }
      const res = await fetch(url, options)
      if (res.ok) {
        success(action === 'complete' ? 'Sponsorship completed — thank you!' : action === 'skip' ? 'Skipped — see you next month' : 'Updated')
        fetchData(view)
      } else {
        const d = await res.json().catch(() => null)
        toastError(d?.error || 'Action failed')
      }
    } catch {
      toastError('Action failed')
    } finally {
      setActing(null)
      setCancelTarget(null)
      setCompleteTarget(null)
      setTxHash('')
      setNote('')
    }
  }

  const entityUrl = (s: Sponsorship) => s.entityType === 'REQUEST' ? `/requests/${s.entityId}` : s.entityType === 'SCHOOL' ? (s.entitySlug ? `/school/${s.entitySlug}` : '/schools') : `/projects/${s.entityId}`
  const dueSoon = (s: Sponsorship) => s.status === 'ACTIVE' && new Date(s.nextReminderAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000

  if (status === 'loading' || loading) return <SkeletonList count={3} />

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px' }}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard/overview' }, { label: 'Sponsorships' }]} />
      <h1>🤝 Sponsorships</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Monthly pledges paid manually to the owner's donation address. Complete a month when you've sent it — or skip, no questions asked.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {(['mine', 'incoming'] as const).map(v => (
          <button
            key={v}
            onClick={() => switchView(v)}
            aria-pressed={view === v}
            style={{ padding: '8px 16px', borderRadius: 8, border: view === v ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', background: view === v ? 'var(--bg-secondary)' : 'transparent', cursor: 'pointer', fontWeight: view === v ? 700 : 400 }}
          >
            {v === 'mine' ? "I'm sponsoring" : 'Sponsoring me'}
          </button>
        ))}
      </div>

      {view === 'mine' && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.85rem' }}>
          <span><strong>{totals.active || 0}</strong> active</span>
          <span><strong>{totals.monthlyPledged || 0}</strong> pledged / month</span>
          <span><strong>{totals.lifetimeGiven || 0}</strong> given lifetime</span>
        </div>
      )}
      {view === 'incoming' && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.85rem' }}>
          <span><strong>{totals.sponsors || 0}</strong> sponsors</span>
          <span><strong>{totals.monthlyPledged || 0}</strong> pledged / month</span>
          <span><strong>{totals.received || 0}</strong> reported received</span>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={view === 'mine' ? 'No sponsorships yet' : 'No sponsors yet'}
          description={view === 'mine' ? 'Sponsor a request or project to support it monthly.' : 'Share your requests and projects — sponsors will appear here.'}
          action={view === 'mine' ? { label: 'Browse requests', href: '/requests' } : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(s => (
            <div key={s.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {view === 'incoming' && s.sponsor?.image && (
                  <Image src={s.sponsor.image} alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Link href={entityUrl(s)} style={{ fontWeight: 700 }}>{s.entityTitle || (s.entityType === 'REQUEST' ? 'Request' : 'Project')}</Link>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {view === 'incoming' && s.sponsor ? `${s.sponsor.name || 'A sponsor'} · ` : ''}
                    {s.amount} {s.currency} / month · {s.status.toLowerCase()}
                    {s.status === 'ACTIVE' && <> · next: {new Date(s.nextReminderAt).toLocaleDateString()}</>}
                    {view === 'incoming' && s.lifetimeReceived != null && <> · received: {s.lifetimeReceived}</>}
                  </div>
                </div>
                {dueSoon(s) && view === 'mine' && <span style={{ fontSize: '0.75rem', background: '#f59e0b20', color: '#f59e0b', padding: '2px 8px', borderRadius: 8 }}>due soon</span>}
              </div>
              {view === 'mine' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button disabled={acting === s.id} onClick={() => setCompleteTarget(s)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer' }}>
                    ✅ Complete month
                  </button>
                  <button disabled={acting === s.id} onClick={() => act(s.id, 'skip')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}>
                    ⏭ Skip month
                  </button>
                  {s.status === 'ACTIVE' ? (
                    <button disabled={acting === s.id} onClick={() => act(s.id, 'pause')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}>
                      ⏸ Pause
                    </button>
                  ) : s.status === 'PAUSED' ? (
                    <button disabled={acting === s.id} onClick={() => act(s.id, 'resume')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}>
                      ▶ Resume
                    </button>
                  ) : null}
                  <button disabled={acting === s.id} onClick={() => setCancelTarget(s.id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {completeTarget && (
        <div role="dialog" aria-modal="true" aria-label="Complete sponsorship month" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setCompleteTarget(null)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 20, maxWidth: 440, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3>✅ Complete this month</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Send <strong>{completeTarget.amount} {completeTarget.currency}</strong> to the owner's donation address, then confirm below.
            </p>
            <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Transaction hash (optional)" aria-label="Transaction hash" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 8 }} />
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCompleteTarget(null)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button disabled={acting === completeTarget.id} onClick={() => act(completeTarget.id, 'complete', { txHash, note })} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer' }}>
                {acting === completeTarget.id ? 'Saving...' : "I've sent it"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && act(cancelTarget, 'cancel')}
        title="Cancel sponsorship?"
        message="This stops future monthly reminders. Reported payments stay on record."
        confirmLabel="Yes, cancel"
        variant="danger"
      />
      {!session && <p>Please sign in.</p>}
    </div>
  )
}

export default function SponsorshipsPage() {
  return (
    <Suspense fallback={<Loading size="medium" />}>
      <SponsorshipsContent />
    </Suspense>
  )
}
