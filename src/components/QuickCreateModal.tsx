'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import ImageUploader from '@/components/ImageUploader'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import { useToast } from '@/context/ToastContext'
import { CONTENT_TEMPLATES, CONTENT_TYPE_MAP } from '@/lib/content-templates'
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, PRODUCT_TYPES } from '@/lib/product-categories'
import styles from './QuickCreateModal.module.css'
import type { EventFormData } from '@/components/EventFormFields'

interface QuickCreateContextType {
  open: (tab?: string) => void
  close: () => void
}

const QuickCreateContext = createContext<QuickCreateContextType>({
  open: () => {},
  close: () => {},
})

export function useQuickCreate() {
  return useContext(QuickCreateContext)
}

const TABS = [
  { id: 'post', label: 'Post', icon: '✏️' },
  { id: 'content', label: 'Content', icon: '📖' },
  { id: 'product', label: 'Product', icon: '🛒' },
  { id: 'event', label: 'Event', icon: '📅' },
  { id: 'project', label: 'Project', icon: '🚀' },
]

export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState('post')

  return (
    <QuickCreateContext.Provider value={{
      open: (t) => { setTab(t || 'post'); setIsOpen(true) },
      close: () => setIsOpen(false),
    }}>
      {children}
      <QuickCreateModalContent
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialTab={tab}
        onTabChange={setTab}
      />
    </QuickCreateContext.Provider>
  )
}

function QuickCreateModalContent({
  open, onClose, initialTab, onTabChange,
}: {
  open: boolean
  onClose: () => void
  initialTab: string
  onTabChange: (tab: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="✨ Quick Create" size="lg">
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${initialTab === t.id ? styles.activeTab : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {initialTab === 'post' && <PostForm onDone={onClose} />}
        {initialTab === 'content' && <ContentForm onDone={onClose} />}
        {initialTab === 'product' && <ProductForm onDone={onClose} />}
        {initialTab === 'event' && <EventForm onDone={onClose} />}
        {initialTab === 'project' && <ProjectForm onDone={onClose} />}
      </div>
    </Modal>
  )
}

function PostForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [posting, setPosting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          images: images.length > 0 ? JSON.stringify(images) : null,
          context: 'PROFILE',
        }),
      })
      if (res.ok) {
        success('Post published!')
        onDone()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to post')
      }
    } catch {
      error('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          className={styles.textarea}
          autoFocus
        />
        <span className={styles.charCount}>{content.length}/2000</span>
      </div>
      <div className={styles.formGroup}>
        <ImageUploader images={images} onChange={setImages} maxImages={6} />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={posting || !content.trim()} className="btn-primary">
          {posting ? 'Posting...' : '✏️ Post'}
        </button>
      </div>
    </form>
  )
}

function ContentForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('article')
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const filteredTemplates = CONTENT_TEMPLATES.filter(t => t.contentType === contentType)

  const applyTemplate = (template: typeof CONTENT_TEMPLATES[0]) => {
    setContent(template.starterContent)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setCreating(true)
    try {
      const schoolRes = await fetch('/api/school')
      const schoolData = await schoolRes.json()
      const slug = schoolData?.schoolSlug
      if (!slug) {
        error('Set up a school first')
        setCreating(false)
        return
      }
      const res = await fetch(`/api/school/${slug}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content,
          contentType,
          price: price ? parseFloat(price) : 0,
          isPaid,
          images: images.length > 0 ? JSON.stringify(images) : null,
        }),
      })
      if (res.ok) {
        success('Content created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create content')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="Content title" required autoFocus />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Type</label>
          <select value={contentType} onChange={e => { setContentType(e.target.value); setContent('') }} className={styles.select}>
            {Object.entries(CONTENT_TYPE_MAP).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Price</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} className={styles.input} placeholder="0.00" step="0.01" />
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
            Paid
          </label>
        </div>
      </div>
      {filteredTemplates.length > 0 && !content && (
        <div className={styles.templateGrid}>
          <label className={styles.label}>Starter Template</label>
          {filteredTemplates.map(t => (
            <button key={t.id} type="button" className={styles.templateCard} onClick={() => applyTemplate(t)}>
              <span className={styles.templateIcon}>{t.icon}</span>
              <span className={styles.templateName}>{t.name}</span>
              <span className={styles.templateDesc}>{t.description}</span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.formGroup}>
        <label className={styles.label}>Content</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className={styles.textareaMono} placeholder="Write your content here..." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Images</label>
        <ImageUploader images={images} onChange={setImages} maxImages={5} />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !title.trim() || !content.trim()} className="btn-primary">
          {creating ? 'Creating...' : '📖 Create Content'}
        </button>
      </div>
    </form>
  )
}

function ProductForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [images, setImages] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          price: price ? parseFloat(price) : 0,
          type: 'PRODUCT',
          category,
          images: images.length > 0 ? JSON.stringify(images) : null,
          published: false,
          condition: PRODUCT_CONDITIONS[0],
          paymentMethods: 'Venmo,PayPal,Cash',
          paymentType: 'BOTH',
          acceptsRequests: false,
          acceptsOffers: false,
        }),
      })
      if (res.ok) {
        success('Product created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="Product name" required autoFocus />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Price ($)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} className={styles.input} placeholder="0.00" step="0.01" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
            {PRODUCT_CATEGORIES.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={styles.textarea} placeholder="Describe your product..." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Images</label>
        <ImageUploader images={images} onChange={setImages} maxImages={5} />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !title.trim()} className="btn-primary">
          {creating ? 'Creating...' : '🛒 Create Product'}
        </button>
      </div>
    </form>
  )
}

function EventForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [formData, setFormData] = useState<EventFormData>(() => getDefaultEventFormData())
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description,
          eventDate: formData.eventDate || undefined,
          endDate: formData.endDate || undefined,
          location: formData.location,
          locationDetails: formData.locationDetails,
          maxJoiners: formData.maxJoiners,
          isTicketed: formData.isTicketed,
          ticketPrice: formData.ticketPrice,
          currency: formData.currency,
          eventCategory: formData.eventCategory,
          published: formData.visibility === 'PUBLIC',
        }),
      })
      if (res.ok) {
        success('Event created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  return (
    <EventFormFields
      formData={formData}
      onChange={(patch) => setFormData(prev => ({ ...prev, ...patch }))}
      onSubmit={handleSubmit}
      mode="create"
      saving={creating}
      onCancel={onDone}
      submitLabel="Create Event"
      compact
    />
  )
}

function ProjectForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('IDEA')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          status,
          published: false,
        }),
      })
      if (res.ok) {
        success('Project created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="Project name" required autoFocus />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)} className={styles.select}>
          <option value="IDEA">💡 Idea</option>
          <option value="IN_PROGRESS">🔨 In Progress</option>
          <option value="COMPLETED">✅ Completed</option>
        </select>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className={styles.textarea} placeholder="Describe your project..." />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !title.trim()} className="btn-primary">
          {creating ? 'Creating...' : '🚀 Create Project'}
        </button>
      </div>
    </form>
  )
}
