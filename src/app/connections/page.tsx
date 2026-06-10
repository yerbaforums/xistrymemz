'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUserProfileUrl } from '@/lib/utils'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
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
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchConnections()
    }
  }, [session])

  const fetchConnections = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch('/api/community/connections?filter=pending'),
        fetch('/api/community/connections?filter=sent')
      ])
      
      if (receivedRes.ok) {
        const data = await receivedRes.json()
        setPendingReceived(data)
      }
      if (sentRes.ok) {
        const data = await sentRes.json()
        setPendingSent(data)
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
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
      }
    } catch (error) {
      console.error('Failed to respond:', error)
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
      }
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      setUpdating(null)
    }
  }

  if (status === 'loading' || loading) {
    return <SkeletonList count={3} />
  }

  const pendingTotal = pendingReceived.length + pendingSent.length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/profile" className={styles.backLink}>
          ← Back to Profile
        </Link>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Connections' }]} />
        <h1 className={styles.title}>Connections</h1>
        <p className={styles.subtitle}>
          {pendingTotal > 0 ? `${pendingTotal} pending request(s)` : 'No pending requests'}
        </p>
      </div>

      {pendingReceived.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Requests Received ({pendingReceived.length})
          </h2>
          <div className={styles.list}>
            {pendingReceived.map(conn => (
              <div key={conn.id} className={styles.card}>
                <Link href={getUserProfileUrl(conn.requester)}>
                  <div className={styles.avatarWrap}>
                    {conn.requester.image ? (
                      <Image src={conn.requester.image} alt="" fill style={{ objectFit: 'cover' }} />
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
                    onClick={() => handleResponse(conn.id, 'REJECTED')}
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

      {pendingSent.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            Requests Sent ({pendingSent.length})
          </h2>
          <div className={styles.list}>
            {pendingSent.map(conn => (
              <div key={conn.id} className={styles.cardSent}>
                <Link href={getUserProfileUrl(conn.receiver)}>
                  <div className={styles.avatarWrapSmall}>
                    {conn.receiver.image ? (
                      <Image src={conn.receiver.image} alt="" fill style={{ objectFit: 'cover' }} />
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
                  onClick={() => cancelRequest(conn.id)}
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

      {pendingTotal === 0 && (
        <EmptyState icon="🤝" title="No pending requests" description="When you send or receive connection requests, they'll appear here" />
      )}
    </div>
  )
}
