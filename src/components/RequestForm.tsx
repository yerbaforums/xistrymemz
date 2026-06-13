'use client'

import { useState } from 'react'
import Link from 'next/link'
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '@/lib/request-categories'
import { getDefaultRequestFormData } from '@/types/request'
import type { RequestFormData } from '@/types/request'
import ImageUploader from '@/components/ImageUploader'

interface RequestFormProps {
  initialData?: Partial<RequestFormData>
  isPublic?: boolean
  onSubmit: (data: RequestFormData) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  saving?: boolean
}

export default function RequestForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Create Request',
  saving: externalSaving,
}: RequestFormProps) {
  const [form, setForm] = useState<RequestFormData>({
    ...getDefaultRequestFormData(),
    ...initialData,
  })
  const [saving, setSaving] = useState(false)

  const isSaving = externalSaving ?? saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Request title *"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        className="input-field"
        required
      />
      <textarea
        placeholder="Describe what you need..."
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        className="textarea-field"
        rows={3}
      />
      <ImageUploader
        images={form.images}
        onChange={(urls) => setForm({ ...form, images: urls })}
        maxImages={1}
      />
      <div className="form-row">
        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="select-field"
        >
          {REQUEST_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
          ))}
        </select>
        <select
          value={form.priority}
          onChange={e => setForm({ ...form, priority: e.target.value })}
          className="select-field"
        >
          {REQUEST_PRIORITIES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <input
          type="number"
          placeholder="Budget (optional)"
          value={form.budget}
          onChange={e => setForm({ ...form, budget: e.target.value })}
          className="input-field"
        />
        <input
          type="number"
          placeholder="Goal Amount (optional)"
          value={form.goalAmount}
          onChange={e => setForm({ ...form, goalAmount: e.target.value })}
          className="input-field"
        />
      </div>
      <input
        type="text"
        placeholder="Location (optional)"
        value={form.location}
        onChange={e => setForm({ ...form, location: e.target.value })}
        className="input-field"
      />
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={e => setForm({ ...form, isPublic: e.target.checked })}
        />
        Make public (visible to everyone)
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.allowFulfillments}
          onChange={e => setForm({ ...form, allowFulfillments: e.target.checked })}
        />
        Allow others to offer to fulfill this request
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.showDonationAddress}
          onChange={e => setForm({ ...form, showDonationAddress: e.target.checked })}
        />
        Show my donation addresses on this request
      </label>
      <div className="form-actions">
        <button type="submit" disabled={isSaving || !form.title.trim()} className="btn-primary">
          {isSaving ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
