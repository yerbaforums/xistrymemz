'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUserProfileUrl } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import styles from './connections.module.css'

interface ConnectionUser {
  id: string
  name: string | null
  image: string | null
  earthId: string | null
  verificationLevel: string
  username: string | null
}

interface Connection {
  id: string
  status: string
  message: string | null
  createdAt: string
  requester: ConnectionUser
  receiver: ConnectionUser
}

export default function ConnectionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([])
  const [pendingSent, setPendingSent] = useState<Connection[]>([])
  const [accepted, setAccepted] = useState<Connection[]>([])
  const [search, setSearch] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; kind: 'cancel' | 'decline' } | null>(null)
  const [loading, setLoading] = useState(true)
  const { success, error: toastError } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchConnections()
      const onFocus = () => fetchConnections()
      window.addEventListener('focus', onFocus)
      return () => window.removeEventListener('focus', onFocus)
    }
  }, [session])

  const fetchConnections = async () => {
    try {
      const [receivedRes, sentRes, acceptedRes] = await Promise.all([
        fetch('/api/community/connections?filter=pending'),
        fetch('/api/community/connections?filter=sent'),
        fetch('/api/community/connections?filter=accepted&limit=50')
      ])
      
      if (receivedRes.ok) {
        const data = await receivedRes.json()
        setPendingReceived(data?.data || data || [])
      }
      if (sentRes.ok) {
        const data = await sentRes.json()
        setPendingSent(data?.data || data || [])
      }
      if (acceptedRes.ok) {
        const data = await acceptedRes.json()
        setAccepted(data?.data || data || [])
      }
    } catch {
      // fetch failed — loading state already handles empty UI
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (connectionId: string, action: 'ACCEPTED' | 'REJECTED') => {
    setUpdating(connectionId)
    try {
      const res = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })
      
      if (res.ok) {
        setPendingReceived(prev => prev.filter(c => c.id !== connectionId))
        success(action === 'ACCEPTED' ? 'Connection accepted!' : 'Connection declined')
      } else {
        toastError('Failed to respond to request')
      }
    } catch {
      toastError('Failed to respond to request')
    } finally {
      setUpdating(null)
    }
  }

  const cancelRequest = async (connectionId: string) => {
    setUpdating(connectionId)
    try {
      const res = await fetch(`/api/community/connections/${connectionId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setPendingSent(prev => prev.filter(c => c.id !== connectionId))
        success('Connection request cancelled')
      } else {
        toastError('Failed to cancel request')
      }
    } catch {
      toastError('Failed to cancel request')
    } finally {
      setUpdating(null)
    }
  }

  if (status === 'loading' || loading) {
    return <SkeletonList count={3} />
  }

  const pendingTotal = pendingReceived.length + pendingSent.length
  const q = search.trim().toLowerCase()
  const matches = (name: string | null) => !q || (name || '').toLowerCase().includes(q)
  const filteredReceived = pendingReceived.filter(c => matches(c.requester.name))
  const filteredSent = pendingSent.filter(c => matches(c.receiver.name))
  const filteredAccepted = accepted.filter(c => {
    const other = c.requester.id === session?.user?.id ? c.receiver : c.requester
    return matches(other.name)
  })

  const runConfirm = async () => {
    if (!confirmTarget) return
    const id = confirmTarget.id
    if (confirmTarget.kind === 'cancel') await cancelRequest(id)
    else await handleResponse(id, 'REJECTED')
    setConfirmTarget(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/profile" className={styles.backLink}>
          ← Back to Profile
        </Link>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Connections' }]} />
        <h1 className={styles.title}>Connections</h1>
        <p className={styles.subtitle}>
          {pendingTotal > 0 ? `${pendingTotal} pending request(s) · ${accepted.length} connected` : `${accepted.length} connected`}
        </p>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search connections..."
          aria-label="Search connections"
          style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', width: '100%', maxWidth: 360 }}
        />
      </div>

      {filteredReceived.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Requests Received ({filteredReceived.length})
          </h2>
          <div className={styles.list}>
            {filteredReceived.map(conn => (
              <div key={conn.id} className={styles.card}>
                <Link href={getUserProfileUrl(conn.requester)}>
                  <div className={styles.avatarWrap}>
                    {conn.requester.image ? (
                      <Image src={conn.requester.image} alt={conn.requester.name || 'Member'} fill style={{ objectFit: 'cover' }} sizes="48px" />
                    ) : (
                      <div className={styles.avatarInitial}>
                        {conn.requester.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                </Link>
                <div className={styles.info}>
                  <Link href={getUserProfileUrl(conn.requester)} className={styles.userNameLink}>
                    <div className={styles.userName}>
                      {conn.requester.name || 'Unknown'}
                    </div>
                  </Link>
                  {conn.requester.earthId && (
                    <div className={styles.earthId}>
                      🌍 Passport {conn.requester.earthId}
                    </div>
                  )}
                  {conn.message && (
                    <div className={styles.message}>
                      &quot;{conn.message}&quot;
                    </div>
                  )}
                </div>
                <div className={styles.actions}>
                  <button
                    onClick={() => handleResponse(conn.id, 'ACCEPTED')}
                    disabled={updating === conn.id}
                    className={styles.acceptBtn}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setConfirmTarget({ id: conn.id, kind: 'decline' })}
                    disabled={updating === conn.id}
                    className={styles.declineBtn}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredSent.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            Requests Sent ({filteredSent.length})
          </h2>
          <div className={styles.list}>
            {filteredSent.map(conn => (
              <div key={conn.id} className={styles.cardSent}>
                <Link href={getUserProfileUrl(conn.receiver)}>
                  <div className={styles.avatarWrapSmall}>
                    {conn.receiver.image ? (
                      <Image src={conn.receiver.image} alt={conn.receiver.name || 'Member'} fill style={{ objectFit: 'cover' }} sizes="40px" />
                    ) : (
                      <div className={styles.avatarInitialSmall}>
                        {conn.receiver.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                </Link>
                <div className={styles.info}>
                  <Link href={getUserProfileUrl(conn.receiver)} className={styles.userNameLink}>
                    <div className={styles.userNameSmall}>
                      {conn.receiver.name || 'Unknown'}
                    </div>
                  </Link>
                  <div className={styles.waiting}>
                    Waiting for response...
                  </div>
                </div>
                <button
                  onClick={() => setConfirmTarget({ id: conn.id, kind: 'cancel' })}
                  disabled={updating === conn.id}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAccepted.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Connected ({filteredAccepted.length})</h2>
          <div className={styles.list}>
            {filteredAccepted.map(conn => {
              const other = conn.requester.id === session?.user?.id ? conn.receiver : conn.requester
              return (
                <div key={conn.id} className={styles.cardSent}>
                  <Link href={getUserProfileUrl(other)}>
                    <div className={styles.avatarWrapSmall}>
                      {other.image ? (
                        <Image src={other.image} alt={other.name || 'Member'} fill style={{ objectFit: 'cover' }} sizes="40px" />
                      ) : (
                        <div className={styles.avatarInitialSmall}>{other.name?.[0] || '?'}</div>
                      )}
                    </div>
                  </Link>
                  <div className={styles.info}>
                    <Link href={getUserProfileUrl(other)} className={styles.userNameLink}>
                      <div className={styles.userNameSmall}>{other.name || 'Unknown'}</div>
                    </Link>
                  </div>
                  <Link href={`/dashboard/messages?user=${other.id}`} className={styles.cancelBtn}>
                    Message
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingTotal === 0 && accepted.length === 0 && (
        <EmptyState
          icon="🤝"
          title="No pending requests"
          description="When you send or receive connection requests, they'll appear here. Discover members to grow your network."
          action={{ label: 'Discover members', href: '/community' }}
        />
      )}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={runConfirm}
        title={confirmTarget?.kind === 'cancel' ? 'Cancel request?' : 'Decline request?'}
        message={confirmTarget?.kind === 'cancel' ? 'This will withdraw your connection request.' : 'This will decline the connection request.'}
        confirmLabel={confirmTarget?.kind === 'cancel' ? 'Yes, cancel' : 'Yes, decline'}
        variant="warning"
      />
    </div>
  )
}
