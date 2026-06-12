'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { EmptyState } from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Message {
  id: string
  name: string | null
  email: string
  subject: string | null
  message: string
  createdAt: string
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    try {
      const res = await fetch('/api/contact')
      if (res.ok) {
        const data = await res.json()
        setMessages(data?.data?.messages || data?.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const subjectLabels: Record<string, string> = {
    general: 'General Inquiry',
    support: 'Technical Support',
    bug: 'Bug Report',
    feature: 'Feature Request',
    partnership: 'Partnership',
    feedback: 'Feedback',
    other: 'Other'
  }

  if (loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Messages' }]} />
      <h1 className={styles.title}>Contact Messages</h1>
      <p className={styles.subtitle}>Shared inbox for all contact form submissions</p>

      {messages.length === 0 ? (
        <EmptyState icon="📬" title="No messages yet" description="Contact form submissions will appear here." />
      ) : (
        <div className={styles.content}>
          <div className={styles.messageList}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.messageItem} ${selectedMessage?.id === msg.id ? styles.selected : ''}`}
                onClick={() => setSelectedMessage(msg)}
              >
                <div className={styles.messageHeader}>
                  <span className={styles.messageEmail}>{msg.email}</span>
                  <span className={styles.messageDate}>{formatDate(msg.createdAt)}</span>
                </div>
                {msg.name && <span className={styles.messageName}>{msg.name}</span>}
                {msg.subject && (
                  <span className={styles.messageSubject}>
                    {subjectLabels[msg.subject] || msg.subject}
                  </span>
                )}
                <p className={styles.messagePreview}>
                  {msg.message.substring(0, 80)}{msg.message.length > 80 ? '...' : ''}
                </p>
              </div>
            ))}
          </div>

          {selectedMessage && (
            <div className={styles.messageDetail}>
              <div className={styles.detailHeader}>
                <div>
                  <h3>{selectedMessage.name || 'No name'}</h3>
                  <a href={`mailto:${selectedMessage.email}`} className={styles.detailEmail}>
                    {selectedMessage.email}
                  </a>
                </div>
                <span className={styles.detailDate}>{formatDate(selectedMessage.createdAt)}</span>
              </div>
              
              {selectedMessage.subject && (
                <div className={styles.detailSubject}>
                  <strong>Subject:</strong> {subjectLabels[selectedMessage.subject] || selectedMessage.subject}
                </div>
              )}

              <div className={styles.detailBody}>
                {selectedMessage.message}
              </div>

              <div className={styles.detailActions}>
                <a 
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Your message'}`}
                  className={styles.replyBtn}
                >
                  Reply via Email
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
