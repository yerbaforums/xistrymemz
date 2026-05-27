'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUserProfileUrl } from '@/lib/utils'
import Skeleton, { SkeletonCard, SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/profile" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '13px' }}>
          ← Back to Profile
        </Link>
        <h1 style={{ margin: '8px 0' }}>Connections</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {pendingTotal > 0 ? `${pendingTotal} pending request(s)` : 'No pending requests'}
        </p>
      </div>

      {pendingReceived.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>
            Requests Received ({pendingReceived.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingReceived.map(conn => (
              <div 
                key={conn.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px'
                }}
              >
                <Link href={getUserProfileUrl(conn.requester)}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--bg-tertiary)',
                    position: 'relative'
                  }}>
                    {conn.requester.image ? (
                      <Image src={conn.requester.image} alt="" fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        {conn.requester.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                </Link>
                <div style={{ flex: 1 }}>
                  <Link href={getUserProfileUrl(conn.requester)} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {conn.requester.name || 'Unknown'}
                    </div>
                  </Link>
                  {conn.requester.earthId && (
                    <div style={{ fontSize: '12px', color: '#7fff7f', marginBottom: '4px' }}>
                      🌍 Passport {conn.requester.earthId}
                    </div>
                  )}
                  {conn.message && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      &quot;{conn.message}&quot;
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleResponse(conn.id, 'ACCEPTED')}
                    disabled={updating === conn.id}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleResponse(conn.id, 'REJECTED')}
                    disabled={updating === conn.id}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
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
          <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>
            Requests Sent ({pendingSent.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingSent.map(conn => (
              <div 
                key={conn.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  opacity: 0.7
                }}
              >
                <Link href={getUserProfileUrl(conn.receiver)}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--bg-tertiary)',
                    position: 'relative'
                  }}>
                    {conn.receiver.image ? (
                      <Image src={conn.receiver.image} alt="" fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}>
                        {conn.receiver.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                </Link>
                <div style={{ flex: 1 }}>
                  <Link href={getUserProfileUrl(conn.receiver)} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ fontWeight: '500' }}>
                      {conn.receiver.name || 'Unknown'}
                    </div>
                  </Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Waiting for response...
                  </div>
                </div>
                <button
                  onClick={() => cancelRequest(conn.id)}
                  disabled={updating === conn.id}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
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