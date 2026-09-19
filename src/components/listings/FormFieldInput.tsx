'use client'

import type { FormField } from '@/types/service'

interface FormFieldInputProps {
  field: FormField
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
}

export function fieldDefaultValue(field: FormField): string {
  return field.type === 'checkbox' ? 'false' : ''
}

export function isFieldAnswered(field: FormField, value: string): boolean {
  if (field.type === 'checkbox') return value === 'true' || field.required
  return typeof value === 'string' && value.trim().length > 0
}

export default function FormFieldInput({ field, value, onChange, id, className = 'w-full' }: FormFieldInputProps) {
  const inputId = id || `field-${field.label.replace(/\W+/g, '-')}`
  const options = field.options && field.options.length > 0 ? field.options : []

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          id={inputId}
          className={className}
          rows={3}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.label}
        />
      )
    case 'select':
      return (
        <select
          id={inputId}
          className={className}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">{options.length ? 'Select an option...' : 'No options available'}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    case 'number':
      return (
        <input
          id={inputId}
          type="number"
          className={className}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.label}
        />
      )
    case 'date':
      return (
        <input
          id={inputId}
          type="date"
          className={className}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'checkbox':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            id={inputId}
            type="checkbox"
            checked={value === 'true'}
            onChange={e => onChange(e.target.checked ? 'true' : 'false')}
          />
          <span>{field.label}</span>
        </label>
      )
    default:
      return (
        <input
          id={inputId}
          type="text"
          className={className}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.label}
        />
      )
  }
}