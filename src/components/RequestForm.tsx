'use client'

import { useState } from 'react'
import Link from 'next/link'
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '@/lib/request-categories'
import { getDefaultRequestFormData } from '@/types/request'
import type { RequestFormData } from '@/types/request'
import ImageUploader from '@/components/ImageUploader'
import LocationPicker from '@/components/LocationPicker'

interface RequestTemplate {
  label: string
  category: string
  priority: string
  hint: string
}

const TEMPLATES: RequestTemplate[] = [
  { label: 'Looking for Service', category: 'SERVICE', priority: 'MEDIUM', hint: 'Find a service provider near you' },
  { label: 'Funding Needed', category: 'FUNDING', priority: 'MEDIUM', hint: 'Raise funds for a project or cause' },
  { label: 'Collaboration', category: 'COLLABORATION', priority: 'MEDIUM', hint: 'Find collaborators for your project' },
  { label: 'Lost & Found', category: 'GENERAL', priority: 'HIGH', hint: 'Post or find lost & found items' },
  { label: 'Custom', category: 'GENERAL', priority: 'MEDIUM', hint: 'Start from scratch' },
]

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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const isSaving = externalSaving ?? saving

  const handleTemplateSelect = (template: RequestTemplate) => {
    setSelectedTemplate(template.label)
    setForm({ ...form, category: template.category, priority: template.priority })
  }

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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            type="button"
            onClick={() => handleTemplateSelect(t)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${selectedTemplate === t.label ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: selectedTemplate === t.label ? 'rgba(0,217,255,0.1)' : 'var(--bg-tertiary)',
              color: selectedTemplate === t.label ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: selectedTemplate === t.label ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {selectedTemplate && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, marginTop: -8 }}>
          {TEMPLATES.find(t => t.label === selectedTemplate)?.hint}
        </p>
      )}
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
      <LocationPicker
        value={{ text: form.location, latitude: null, longitude: null }}
        onChange={v => setForm({ ...form, location: v.text })}
      />
      <div className="form-row">
        <input
          type="date"
          placeholder="Deadline"
          value={form.deadline}
          onChange={e => setForm({ ...form, deadline: e.target.value })}
          className="input-field"
        />
      </div>
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
