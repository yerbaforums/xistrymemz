'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import styles from '../../messages/messages.module.css'
import { getUserProfileUrl } from '@/lib/utils'
import TranslateButton from '@/components/TranslateButton'
import { SkeletonList } from '@/components/Skeleton'
import Loading from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import Avatar from '@/components/Avatar'

import InboxView from '@/components/InboxView'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  sender?: User
  receiver?: User
}

interface Conversation {
  userId: string
  user: User
  lastMessage: Message
  unreadCount: number
}

function DashboardMessagesContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'chat' | 'inbox'>('inbox')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userParam = searchParams.get('user')
  const inquiryParam = searchParams.get('inquiry')
  const [inquiryService, setInquiryService] = useState<{ id: string; title: string; price: number | null } | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchConversations()
      if (userParam) {
        fetchUser(userParam)
        setMode('chat')
      }
    }
  }, [session, userParam])

  // Prefill a service inquiry into the composer (once per inquiry param).
  // Reads newMessage via ref to avoid re-running after the user starts typing.
  const inquiryPrefilledRef = useRef<string | null>(null)
  const newMessageRef = useRef(newMessage)
  newMessageRef.current = newMessage
  useEffect(() => {
    if (!userParam || !inquiryParam) return
    if (inquiryPrefilledRef.current === inquiryParam) return
    if (newMessageRef.current.trim()) return
    inquiryPrefilledRef.current = inquiryParam
    fetch(`/api/services/${inquiryParam}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const svc = data?.data?.service || data?.service
        const title = svc?.title || 'your service'
        if (svc) setInquiryService({ id: inquiryParam, title: svc.title, price: svc.price ?? null })
        const url = `${window.location.origin}/services/${inquiryParam}`
        setNewMessage(`Hi! I'm interested in "${title}" (${url}). Here's what I'm looking for: `)
      })
      .catch(() => {
        setNewMessage(`Hi! I'm interested in your service (${window.location.origin}/services/${inquiryParam}). Here's what I'm looking for: `)
      })
  }, [userParam, inquiryParam])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
    }
  }, [selectedUser])

  useEffect(() => {
    if (!selectedUser) return
    const interval = setInterval(() => {
      fetchMessages(selectedUser.id)
      fetchConversations()
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data?.data?.conversations || data?.conversations || [])
      }
    } catch {
      // silent — empty state covers failure
    } finally {
      setLoading(false)
    }
  }

  const fetchUser = async (userId: string) => {
    setFetchError(null)
    try {
      const res = await fetch(`/api/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedUser(data.user)
      } else {
        setFetchError('User not found')
      }
    } catch {
      setFetchError('Failed to load user')
    }
  }

  const fetchMessages = async (userId: string) => {
    setFetchError(null)
    try {
      const res = await fetch(`/api/messages?user=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data?.data?.messages || data?.messages || [])
      } else {
        setFetchError('Failed to load messages')
      }
    } catch {
      setFetchError('Failed to load messages')
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || sending) return

    const content = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      senderId: session?.user?.id || '',
      receiverId: selectedUser.id,
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setNewMessage('')
    setSendError(null)
    setSending(true)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content
        })
      })

      if (res.ok) {
        fetchMessages(selectedUser.id)
        fetchConversations()
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setNewMessage(content)
        setSendError('Failed to send. Tap Send to retry.')
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(content)
      setSendError('Failed to send. Check connection and retry.')
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return <SkeletonList count={3} />
  }

  return (
    <>

      <div className={styles.modeTabs}>
        <button
          className={`${styles.modeTab} ${mode === 'inbox' ? styles.modeTabActive : ''}`}
          onClick={() => setMode('inbox')}
        >
          📬 Inbox
        </button>
        <button
          className={`${styles.modeTab} ${mode === 'chat' ? styles.modeTabActive : ''}`}
          onClick={() => setMode('chat')}
        >
          💬 Chat
        </button>
      </div>

      {mode === 'inbox' ? (
        <InboxView onChatUser={(userId) => {
          setMode('chat')
          fetchUser(userId)
        }} />
      ) : (
      <div className={styles.messagesLayout}>
        <div className={styles.conversationsList}>
          <div className={styles.conversationsHeader}>
            <h2>Conversations</h2>
            <Link href="/community?ref=messages" className={styles.newMessageBtn}>+ Find People</Link>
          </div>

          {conversations.length > 0 ? (
            <div className={styles.conversations}>
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  className={`${styles.conversationItem} ${selectedUser?.id === conv.userId ? styles.active : ''}`}
                  onClick={() => {
                    setMode('chat')
                    setSelectedUser(conv.user)
                    router.replace(`/dashboard/messages?user=${conv.userId}`, { scroll: false })
                  }}
                >
                  <div className={styles.conversationAvatar}>
                    <Avatar src={conv.user.image} name={conv.user.name || conv.user.email} size={40} />
                  </div>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationName}>
                      {conv.user.name || 'Anonymous User'}
                      {conv.unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className={styles.conversationPreview}>
                      {conv.lastMessage?.content?.substring(0, 40)}
                      {conv.lastMessage?.content?.length > 40 ? '...' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon="💬" title="No conversations yet" description="Connect with community members to start chatting." />
          )}
        </div>

        <div className={styles.chatArea}>
          {selectedUser ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatUserInfo}>
                  <div className={styles.chatAvatar}>
                    <Avatar src={selectedUser.image} name={selectedUser.name || selectedUser.email} size={40} />
                  </div>
                  <div>
                    <h3>{selectedUser.name || 'Anonymous User'}</h3>
                    <p>{selectedUser.email}</p>
                  </div>
                </div>
                <Link href={getUserProfileUrl(selectedUser)} className={styles.viewProfileBtn}>
                  View Profile
                </Link>
              </div>

              {inquiryService && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8, fontSize: '0.82rem' }} role="status">
                  <span>💬 Inquiry about</span>
                  <Link href={`/services/${inquiryService.id}`} style={{ fontWeight: 700 }}>{inquiryService.title}</Link>
                  {inquiryService.price != null && <span>· ${inquiryService.price}</span>}
                  <Link href={`/services/${inquiryService.id}`} style={{ marginLeft: 'auto' }}>Book →</Link>
                </div>
              )}

              {fetchError && (
                <div className={styles.errorBanner}>{fetchError}</div>
              )}

              <div className={styles.messagesContainer}>
                {messages.map((message) => {
                  const isOwn = message.senderId === session?.user?.id
                  return (
                    <div
                      key={message.id}
                      className={`${styles.message} ${isOwn ? styles.own : styles.other}`}
                    >
                      {!isOwn && (
                        <div className={styles.messageAvatar}>
                          <Avatar src={message.sender?.image} name={message.sender?.name} size={24} />
                        </div>
                      )}
                      <div className={styles.messageBubble}>
                        <p>{message.content}</p>
                        <TranslateButton text={message.content} />
                        <span className={styles.messageTime}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {sendError && (
                <div className={styles.errorBanner} role="alert">{sendError}</div>
              )}

              <form className={styles.messageForm} onSubmit={sendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className={styles.messageInput}
                  aria-label="Type a message"
                />
                <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim() || sending}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <div className={styles.noChatIcon}>💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the list or connect with new members</p>
              <a href="/community" className={styles.connectBtn}>
                Browse Community
              </a>
            </div>
          )}
        </div>
      </div>
      )}
    </>
  )
}

export default function DashboardMessagesPage() {
  return (
    <Suspense fallback={<Loading size="medium" />}>
      <DashboardMessagesContent />
    </Suspense>
  )
}
