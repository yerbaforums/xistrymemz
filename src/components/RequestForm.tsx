'use client'

import { useState } from 'react'
import { z } from 'zod'
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '@/lib/request-categories'
import { getDefaultRequestFormData } from '@/types/request'
import type { RequestFormData } from '@/types/request'
import ImageUploader from '@/components/ImageUploader'
import LocationPicker from '@/components/LocationPicker'
import { FieldListEditor } from '@/components/listings/FieldListEditor'
import type { FormField as CustomFormField } from '@/types/service'
import { useZodForm } from '@/hooks/useZodForm'
import FormField from '@/components/ui/FormField'
import FormInput from '@/components/ui/FormInput'
import FormTextarea from '@/components/ui/FormTextarea'
import FormSelect from '@/components/ui/FormSelect'

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

const requestFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Keep the title under 200 characters'),
  description: z.string().max(5000, 'Keep the description under 5000 characters'),
  category: z.string(),
  priority: z.string(),
  budget: z.string(),
  goalAmount: z.string(),
  location: z.string(),
  deadline: z.string(),
  isPublic: z.boolean(),
  allowFulfillments: z.boolean(),
  showDonationAddress: z.boolean(),
  images: z.array(z.string()),
  hashtags: z.array(z.string()),
  customFields: z.unknown().optional(),
  projectId: z.string().optional(),
})

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
  const { values: form, errors, setValue, patch, handleSubmit } = useZodForm<RequestFormData>(
    requestFormSchema,
    { ...getDefaultRequestFormData(), ...initialData },
  )
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const isSaving = externalSaving ?? saving

  const handleTemplateSelect = (template: RequestTemplate) => {
    setSelectedTemplate(template.label)
    patch({ category: template.category, priority: template.priority })
  }

  const submit = handleSubmit(async data => {
    setSaving(true)
    try {
      await onSubmit(data)
    } finally {
      setSaving(false)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
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
      <FormField label="Title" htmlFor="request-title" error={errors.title} required>
        <FormInput
          id="request-title"
          type="text"
          placeholder="Request title *"
          value={form.title}
          error={errors.title}
          onChange={e => setValue('title', e.target.value)}
          autoComplete="off"
        />
      </FormField>
      <FormField label="Description" htmlFor="request-description" error={errors.description}>
        <FormTextarea
          id="request-description"
          placeholder="Describe what you need..."
          value={form.description}
          error={errors.description}
          onChange={e => setValue('description', e.target.value)}
          rows={3}
        />
      </FormField>
      <ImageUploader
        images={form.images}
        onChange={(urls) => setValue('images', urls)}
        maxImages={1}
      />
      <div className="form-row">
        <FormField label="Category" htmlFor="request-category">
          <FormSelect
            id="request-category"
            value={form.category}
            onChange={e => setValue('category', e.target.value)}
          >
            {REQUEST_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Priority" htmlFor="request-priority">
          <FormSelect
            id="request-priority"
            value={form.priority}
            onChange={e => setValue('priority', e.target.value)}
          >
            {REQUEST_PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </FormSelect>
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="Budget (optional)" htmlFor="request-budget">
          <FormInput
            id="request-budget"
            type="number"
            placeholder="Budget (optional)"
            value={form.budget}
            onChange={e => setValue('budget', e.target.value)}
          />
        </FormField>
        <FormField label="Goal Amount (optional)" htmlFor="request-goal">
          <FormInput
            id="request-goal"
            type="number"
            placeholder="Goal Amount (optional)"
            value={form.goalAmount}
            onChange={e => setValue('goalAmount', e.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Location" htmlFor="request-location" hint="Where do you need this?">
        <LocationPicker
          value={{ text: form.location, latitude: null, longitude: null }}
          onChange={v => setValue('location', v.text)}
        />
      </FormField>
      <FormField label="Deadline (optional)" htmlFor="request-deadline">
        <FormInput
          id="request-deadline"
          type="date"
          value={form.deadline}
          onChange={e => setValue('deadline', e.target.value)}
        />
      </FormField>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={e => setValue('isPublic', e.target.checked)}
        />
        Make public (visible to everyone)
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.allowFulfillments}
          onChange={e => setValue('allowFulfillments', e.target.checked)}
        />
        Allow others to offer to fulfill this request
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.showDonationAddress}
          onChange={e => setValue('showDonationAddress', e.target.checked)}
        />
        Show my donation addresses on this request
      </label>
      <div style={{ margin: '18px 0' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 4 }}>Questions for helpers (optional)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
          Ask helpers to answer questions before they submit an offer (e.g. availability, location, gear).
        </p>
        <FieldListEditor
          fields={form.customFields}
          onChange={(fields: CustomFormField[]) => setValue('customFields', fields)}
          title="Add a question"
        />
      </div>
      <div className="form-actions">
        <button type="submit" disabled={isSaving} className="btn-primary">
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