'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

interface Subscriber {
  id: string
  email: string
  name: string | null
  subscribed: boolean
  source: string
  createdAt: string
}

export default function SubscribersPage() {
  const { info } = useToast()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchSubscribers()
  }, [])

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/subscribers')
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscriber?')) return
    try {
      const res = await fetch(`/api/admin/subscribers?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSubscribers(subscribers.filter(s => s.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addEmail.trim()) return

    setAdding(true)
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail, name: addName || undefined })
      })

      if (res.ok) {
        setAddEmail('')
        setAddName('')
        fetchSubscribers()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const handleDownloadCSV = () => {
    const emails = filteredSubscribers.map(s => s.email).join('\n')
    const blob = new Blob([emails], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscribers.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadJSON = () => {
    const data = JSON.stringify(filteredSubscribers, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscribers.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailSubject.trim() || !emailBody.trim()) return

    setSending(true)
    try {
      const emails = filteredSubscribers.map(s => s.email)
      info(`Email feature ready! Would send to ${emails.length} subscribers.\n\nSubject: ${emailSubject}\n\nThis would integrate with an email service like SendGrid, Mailgun, or AWS SES.`)
      setShowEmailForm(false)
      setEmailSubject('')
      setEmailBody('')
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const filteredSubscribers = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Email Subscribers</h1>
          <p>Manage your email list ({subscribers.length} subscribers)</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowEmailForm(true)} className={styles.emailBtn}>
            Send Email
          </button>
          <button onClick={handleDownloadCSV} className={styles.downloadBtn}>
            Download .txt
          </button>
          <button onClick={handleDownloadJSON} className={styles.downloadBtn}>
            Download .json
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search subscribers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <form onSubmit={handleAddSubscriber} className={styles.addForm}>
          <input
            type="email"
            placeholder="Email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Name (optional)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />
          <button type="submit" disabled={adding}>
            {adding ? 'Adding...' : 'Add Subscriber'}
          </button>
        </form>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Source</th>
              <th>Subscribed</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscribers.map(subscriber => (
              <tr key={subscriber.id}>
                <td>{subscriber.email}</td>
                <td>{subscriber.name || '-'}</td>
                <td>{subscriber.source}</td>
                <td>
                  <span className={subscriber.subscribed ? styles.active : styles.inactive}>
                    {subscriber.subscribed ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{new Date(subscriber.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleDelete(subscriber.id)}
                    className={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSubscribers.length === 0 && (
          <div className={styles.empty}>No subscribers found</div>
        )}
      </div>

      {showEmailForm && (
        <div className={styles.modalOverlay} onClick={() => setShowEmailForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Send Email to {filteredSubscribers.length} Subscribers</h2>
            <form onSubmit={handleSendEmail}>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email body..."
                  rows={10}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowEmailForm(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={sending} className={styles.sendBtn}>
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
