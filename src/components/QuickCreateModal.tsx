'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import ImageUploader from '@/components/ImageUploader'
import HashtagInput from '@/components/HashtagInput'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import LocationPicker from '@/components/LocationPicker'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import AssetPicker from '@/components/AssetPicker'
import { useToast } from '@/context/ToastContext'
import { CONTENT_TEMPLATES, CONTENT_TYPE_MAP } from '@/lib/content-templates'
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, PRODUCT_TYPES } from '@/lib/product-categories'
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from '@/types/service'
import { PROJECT_CATEGORIES } from '@/lib/project-categories'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import styles from './QuickCreateModal.module.css'
import type { EventFormData } from '@/components/EventFormFields'
import type { UserAsset } from '@/components/AssetPicker'
import type { DonationAddr } from '@/types/product'

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
  { id: 'group', label: 'Group', icon: '👥' },
  { id: 'request', label: 'Request', icon: '📝' },
  { id: 'service', label: 'Service', icon: '🔧' },
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
        {initialTab === 'group' && <GroupForm onDone={onClose} />}
        {initialTab === 'request' && <RequestForm onDone={onClose} />}
        {initialTab === 'service' && <ServiceForm onDone={onClose} />}
      </div>
    </Modal>
  )
}

function PostForm({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const { success, error } = useToast()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [hashtags, setHashtags] = useState<string[]>([])
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
          hashtags: hashtags.length > 0 ? hashtags : undefined,
        }),
      })
      if (res.ok) {
        success('Post published!')
        onDone()
        router.refresh()
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
      <div className={styles.formGroup}>
        <HashtagInput value={hashtags} onChange={setHashtags} placeholder="Add hashtags..." />
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
  const [hashtags, setHashtags] = useState<string[]>([])
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
          hashtags: hashtags.length > 0 ? hashtags : undefined,
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
      <div className={styles.formGroup}>
        <label className={styles.label}>Hashtags</label>
        <HashtagInput value={hashtags} onChange={setHashtags} placeholder="Add hashtags..." />
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
  const [type, setType] = useState('PRODUCT')
  const [category, setCategory] = useState('OTHER')
  const [condition, setCondition] = useState<string>(PRODUCT_CONDITIONS[0])
  const [location, setLocation] = useState('')
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
          type,
          category,
          condition,
          location: location || undefined,
          images: images.length > 0 ? JSON.stringify(images) : null,
          published: false,
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
          <label className={styles.label}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className={styles.select}>
            {PRODUCT_TYPES.map(t => (<option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>))}
          </select>
        </div>
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
            {PRODUCT_CATEGORIES.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Condition</label>
          <select value={condition} onChange={e => setCondition(e.target.value)} className={styles.select}>
            {PRODUCT_CONDITIONS.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={styles.textarea} placeholder="Describe your product..." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Location</label>
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={styles.input} placeholder="City, State" />
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

function GroupForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          privacy: isPrivate ? 'PRIVATE' : 'PUBLIC',
          hashtags: hashtags.length > 0 ? hashtags : undefined,
        }),
      })
      if (res.ok) {
        success('Group created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Group Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className={styles.input} placeholder="Group name" required autoFocus />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={styles.textarea} placeholder="What is this group about?" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          Private group
        </label>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Hashtags</label>
        <HashtagInput value={hashtags} onChange={setHashtags} placeholder="Add hashtags..." />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !name.trim()} className="btn-primary">
          {creating ? 'Creating...' : '👥 Create Group'}
        </button>
      </div>
    </form>
  )
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [priority, setPriority] = useState('MEDIUM')
  const [budget, setBudget] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          category,
          priority,
          budget: budget ? parseFloat(budget) : null,
          isPublic: true,
          hashtags: hashtags.length > 0 ? hashtags : undefined,
        }),
      })
      if (res.ok) {
        success('Request created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create request')
    } finally {
      setCreating(false)
    }
  }

  const REQUEST_CATEGORIES = [
    'GENERAL', 'FUNDING', 'SERVICES', 'GOODS', 'HOUSING',
    'TRANSPORTATION', 'FOOD', 'HEALTH', 'EDUCATION', 'OTHER'
  ]

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="What do you need?" required autoFocus />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
            {REQUEST_CATEGORIES.map(c => (<option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className={styles.select}>
            <option value="LOW">🟢 Low</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="HIGH">🔴 High</option>
            <option value="URGENT">🔥 Urgent</option>
          </select>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Budget ($)</label>
        <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className={styles.input} placeholder="0.00" step="0.01" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={styles.textarea} placeholder="Describe what you need..." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Hashtags</label>
        <HashtagInput value={hashtags} onChange={setHashtags} placeholder="Add hashtags..." />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !title.trim()} className="btn-primary">
          {creating ? 'Creating...' : '📝 Create Request'}
        </button>
      </div>
    </form>
  )
}

function ServiceForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          duration: parseInt(duration) || 60,
          price: price ? parseFloat(price) : null,
          location: location.trim() || undefined,
        }),
      })
      if (res.ok) {
        success('Service created!')
        onDone()
        router.refresh()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create')
      }
    } catch {
      error('Failed to create service')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="Service title" required autoFocus />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
            {SERVICE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{SERVICE_CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Duration (min)</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className={styles.input} placeholder="60" min="5" />
        </div>
      </div>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Price ($)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} className={styles.input} placeholder="0.00" step="0.01" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={styles.input} placeholder="City, State" />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={styles.textarea} placeholder="Describe your service..." />
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !title.trim()} className="btn-primary">
          {creating ? 'Creating...' : '🔧 Create Service'}
        </button>
      </div>
    </form>
  )
}

function ProjectForm({ onDone }: { onDone: () => void }) {
  const { success, error } = useToast()
  const router = useRouter()
  const userDonationAddrs = useDonationAddresses()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('IDEA')
  const [category, setCategory] = useState('')
  const [coverImage, setCoverImage] = useState<string[]>([])
  const [lookingForCollaborators, setLookingForCollaborators] = useState(false)
  const [needsVolunteers, setNeedsVolunteers] = useState(false)
  const [volunteerRoles, setVolunteerRoles] = useState('')
  const [volunteerDescription, setVolunteerDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [acceptsDonations, setAcceptsDonations] = useState(false)
  const [selectedDonationAddrs, setSelectedDonationAddrs] = useState<DonationAddr[]>([])
  const [location, setLocation] = useState<{ text: string; latitude: number | null; longitude: number | null }>({ text: '', latitude: null, longitude: null })
  const [goals, setGoals] = useState('')
  const [mileposts, setMileposts] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [linkedAsset, setLinkedAsset] = useState<UserAsset | null>(null)
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          status,
          category: category || undefined,
          imageUrl: coverImage[0] || null,
          lookingForCollaborators,
          needsVolunteers,
          volunteerRoles: volunteerRoles || null,
          volunteerDescription: volunteerDescription || null,
          goalAmount: goalAmount ? parseFloat(goalAmount) : null,
          acceptsDonations,
          donationAddress: selectedDonationAddrs[0]?.address || null,
          donationCurrency: selectedDonationAddrs[0]?.currency || 'ETH',
          donationAddresses: selectedDonationAddrs.length > 0 ? JSON.stringify(selectedDonationAddrs) : null,
          location: location.text || undefined,
          latitude: location.latitude ?? undefined,
          longitude: location.longitude ?? undefined,
          goals,
          mileposts,
          published: false,
          hashtags: hashtags.length > 0 ? hashtags : undefined,
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
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={styles.select}>
            <option value="IDEA">💡 Idea</option>
            <option value="IN_PROGRESS">🔨 In Progress</option>
            <option value="COMPLETED">✅ Completed</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
            <option value="">Select...</option>
            {PROJECT_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={styles.textarea} placeholder="Describe your project..." />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Cover Image</label>
        <ImageUploader images={coverImage} onChange={setCoverImage} maxImages={1} />
      </div>

      <details className={styles.sectionDetails}>
        <summary className={styles.sectionSummary}>🤝 Collaborate</summary>
        <div className={styles.sectionContent}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={lookingForCollaborators} onChange={e => setLookingForCollaborators(e.target.checked)} />
            Looking for collaborators
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={needsVolunteers} onChange={e => setNeedsVolunteers(e.target.checked)} />
            Needs volunteers
          </label>
          {needsVolunteers && (
            <div className={styles.nestedFields}>
              <input type="text" value={volunteerRoles} onChange={e => setVolunteerRoles(e.target.value)} className={styles.input} placeholder="Volunteer roles (comma separated)" />
              <textarea value={volunteerDescription} onChange={e => setVolunteerDescription(e.target.value)} rows={2} className={styles.textarea} placeholder="Describe what volunteers will do..." />
            </div>
          )}
        </div>
      </details>

      <details className={styles.sectionDetails}>
        <summary className={styles.sectionSummary}>💰 Funding</summary>
        <div className={styles.sectionContent}>
          <input type="number" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} className={styles.input} placeholder="Funding goal ($)" step="0.01" />
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={acceptsDonations} onChange={e => setAcceptsDonations(e.target.checked)} />
            Accept crypto donations
          </label>
          {acceptsDonations && (
            <DonationAddressPicker
              savedAddresses={userDonationAddrs}
              selectedAddresses={selectedDonationAddrs}
              onAddressesChange={setSelectedDonationAddrs}
            />
          )}
        </div>
      </details>

      <details className={styles.sectionDetails}>
        <summary className={styles.sectionSummary}>📍 Location</summary>
        <div className={styles.sectionContent}>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
      </details>

      <details className={styles.sectionDetails}>
        <summary className={styles.sectionSummary}>🎯 Goals & Milestones</summary>
        <div className={styles.sectionContent}>
          <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={3} className={styles.textarea} placeholder="Goals (one per line)" />
          <textarea value={mileposts} onChange={e => setMileposts(e.target.value)} rows={3} className={styles.textarea} placeholder="Milestones (one per line)" />
        </div>
      </details>

      <details className={styles.sectionDetails}>
        <summary className={styles.sectionSummary}>🔗 Tags & Links</summary>
        <div className={styles.sectionContent}>
          <HashtagInput value={hashtags} onChange={setHashtags} placeholder="Add hashtags..." />
          <AssetPicker
            filterTypes={['SCHOOL', 'SHOP']}
            selectedAsset={linkedAsset}
            onSelect={setLinkedAsset}
            label="Link to a school or shop"
          />
        </div>
      </details>

      <div className={styles.formActions}>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={creating || !title.trim()} className="btn-primary">
          {creating ? 'Creating...' : '🚀 Create Project'}
        </button>
      </div>
    </form>
  )
}
