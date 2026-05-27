'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import styles from './messages.module.css'
import { getUserProfileUrl } from '@/lib/utils'
import TranslateButton from '@/components/TranslateButton'
import Skeleton, { SkeletonCard, SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

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

function MessagesContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const userParam = searchParams.get('user')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchConversations()
      if (userParam) {
        fetchUser(userParam)
      }
    }
  }, [session, userParam])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
    }
  }, [selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchMessages = async (userId: string) => {
    try {
      const res = await fetch(`/api/messages?user=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser) return

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: newMessage.trim()
        })
      })

      if (res.ok) {
        setNewMessage('')
        fetchMessages(selectedUser.id)
        fetchConversations()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (status === 'loading' || loading) {
    return <SkeletonList count={3} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Messages</h1>
        <p>Connect with your community</p>
      </div>

      <div className={styles.messagesLayout}>
        <div className={styles.conversationsList}>
          <div className={styles.conversationsHeader}>
            <h2>Conversations</h2>
            <a href="/community" className={styles.newMessageBtn}>+ New</a>
          </div>
          
          {conversations.length > 0 ? (
            <div className={styles.conversations}>
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  className={`${styles.conversationItem} ${selectedUser?.id === conv.userId ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedUser(conv.user)
                    router.replace(`/messages?user=${conv.userId}`, { scroll: false })
                  }}
                >
                  <div className={styles.conversationAvatar}>
                    {conv.user.image ? (
                      <img src={conv.user.image} alt={conv.user.name || 'User'} />
                    ) : (
                      <span>{conv.user.name?.[0] || conv.user.email[0].toUpperCase()}</span>
                    )}
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
                    {selectedUser.image ? (
                      <img src={selectedUser.image} alt={selectedUser.name || 'User'} />
                    ) : (
                      <span>{selectedUser.name?.[0] || selectedUser.email[0].toUpperCase()}</span>
                    )}
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
                          {message.sender?.image ? (
                            <img src={message.sender.image} alt="" />
                          ) : (
                            <span>{message.sender?.name?.[0] || '?'}</span>
                          )}
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

              <form className={styles.messageForm} onSubmit={sendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className={styles.messageInput}
                />
                <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim()}>
                  Send
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
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<SkeletonList count={3} />}>
      <MessagesContent />
    </Suspense>
  )
}
