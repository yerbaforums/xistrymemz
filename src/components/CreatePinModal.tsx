'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './CreatePinModal.module.css'

const PIN_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'LOST_FOUND', label: 'Lost & Found' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'JOBS', label: 'Jobs' },
  { value: 'FREE', label: 'Free' },
]

interface UserAsset {
  id: string
  type: 'PRODUCT' | 'SERVICE' | 'EVENT' | 'GROUP' | 'PLAN'
  title: string
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

const ASSET_ICONS: Record<string, string> = {
  PRODUCT: '🛒',
  SERVICE: '🔧',
  EVENT: '📅',
  GROUP: '👥',
  PLAN: '🚀',
  REQUEST: '📝',
  SCHOOL_CONTENT: '📚',
  POST: '✏️',
  SHOP: '🏪',
  USER: '👤',
}

interface CreatePinModalProps {
  boardSlug: string
  boardName: string
  onClose: () => void
  onCreated: () => void
}

export default function CreatePinModal({ boardSlug, boardName, onClose, onCreated }: CreatePinModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [imageUrls, setImageUrls] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [assets, setAssets] = useState<UserAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null)
  const [showAssetPicker, setShowAssetPicker] = useState(false)

  useEffect(() => {
    const fetchAssets = async () => {
      setAssetsLoading(true)
      try {
        const res = await fetch('/api/user/assets')
        if (res.ok) {
          const data = await res.json()
          setAssets(data.assets || [])
        }
      } catch {}
      setAssetsLoading(false)
    }
    fetchAssets()
  }, [])

  const handleSelectAsset = (asset: UserAsset) => {
    setSelectedAsset(asset === selectedAsset ? null : asset)
    if (!title && asset.title) {
      setTitle(asset.title)
    }
  }

  const groupedAssets = assets.reduce<Record<string, UserAsset[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('Content is required')
      return
    }
    if (!expiresAt) {
      setError('Expiration date is required')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const images = imageUrls.trim() ? imageUrls.split('\n').map(s => s.trim()).filter(Boolean) : undefined
      const res = await fetch(`/api/boards/${boardSlug}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          images,
          category,
          entityType: selectedAsset?.type || undefined,
          entityId: selectedAsset?.id || undefined,
          entityTitle: selectedAsset?.title || undefined,
          entityImage: selectedAsset?.image || undefined,
          latitude: selectedAsset?.latitude || undefined,
          longitude: selectedAsset?.longitude || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          expiresAt,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create pin')
      }

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📌 Pin to {boardName}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label}>
            Category
            <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
              {PIN_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Title (optional)
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="Lost Cat - Orange Tabby"
            />
          </label>

          <label className={styles.label}>
            Content *
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className={styles.textarea}
              placeholder="Describe your pin..."
              rows={4}
              required
            />
          </label>

          <label className={styles.label}>
            Image URLs (one per line, optional)
            <textarea
              value={imageUrls}
              onChange={e => setImageUrls(e.target.value)}
              className={styles.textarea}
              placeholder="https://example.com/image.jpg"
              rows={2}
            />
          </label>

          <div className={styles.assetSection}>
            <div className={styles.assetSectionHeader}>
              <span className={styles.label}>Link an item (optional)</span>
              <button
                type="button"
                className={styles.assetToggle}
                onClick={() => setShowAssetPicker(!showAssetPicker)}
              >
                {showAssetPicker ? 'Hide' : `Choose (${assets.length})`}
              </button>
            </div>

            {selectedAsset && (
              <div className={styles.selectedAsset}>
                <span>{ASSET_ICONS[selectedAsset.type] || '📌'}</span>
                <span className={styles.selectedAssetTitle}>{selectedAsset.title}</span>
                <span className={styles.selectedAssetType}>{selectedAsset.type}</span>
                <button type="button" className={styles.clearAsset} onClick={() => setSelectedAsset(null)}>✕</button>
              </div>
            )}

            {showAssetPicker && (
              <div className={styles.assetPicker}>
                {assetsLoading ? (
                  <p className={styles.assetsLoading}>Loading your items...</p>
                ) : assets.length === 0 ? (
                  <p className={styles.assetsEmpty}>No items found. Create products, events, groups, or plans first.</p>
                ) : (
                  Object.entries(groupedAssets).map(([type, items]) => (
                    <div key={type} className={styles.assetGroup}>
                      <div className={styles.assetGroupTitle}>
                        {ASSET_ICONS[type] || '📌'} {type.charAt(0) + type.slice(1).toLowerCase()}s ({items.length})
                      </div>
                      <div className={styles.assetGrid}>
                        {items.map(asset => {
                          const isSelected = selectedAsset?.id === asset.id && selectedAsset?.type === asset.type
                          return (
                            <button
                              key={`${asset.type}-${asset.id}`}
                              type="button"
                              className={`${styles.assetCard} ${isSelected ? styles.assetCardSelected : ''}`}
                              onClick={() => handleSelectAsset(asset)}
                            >
                              {asset.image ? (
                                <div className={styles.assetCardImage}>
                                  <Image src={asset.image} alt={asset.title} width={48} height={48} style={{ objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div className={styles.assetCardIcon}>{ASSET_ICONS[asset.type] || '📌'}</div>
                              )}
                              <div className={styles.assetCardInfo}>
                                <span className={styles.assetCardTitle}>{asset.title}</span>
                                {asset.location && <span className={styles.assetCardLoc}>{asset.location}</span>}
                              </div>
                              {isSelected && <span className={styles.assetCheck}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <label className={styles.label}>
            Contact Name (optional)
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className={styles.input}
              placeholder="Jane Doe"
            />
          </label>

          <label className={styles.label}>
            Contact Email (optional)
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              className={styles.input}
              placeholder="jane@example.com"
            />
          </label>

          <label className={styles.label}>
            Contact Phone (optional)
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              className={styles.input}
              placeholder="+1 555-0123"
            />
          </label>

          <label className={styles.label}>
            Expires At *
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className={styles.input}
              required
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Pinning...' : '📌 Pin It'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
