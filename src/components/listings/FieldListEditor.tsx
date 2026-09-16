'use client'

import { useState } from 'react'
import type { FormFieldType } from '@/types/service'
import styles from './FieldListEditor.module.css'

export interface FieldListItem {
  label: string
  type: FormFieldType
  required: boolean
  options?: string[] | null
}

export interface FieldListEditorProps {
  fields: FieldListItem[]
  onChange: (fields: FieldListItem[]) => void
  title?: string
  hint?: string
  placeholder?: string
}

export function FieldListEditor({
  fields,
  onChange,
  title = 'Custom Questions',
  hint,
  placeholder = 'Question label',
}: FieldListEditorProps) {
  const [draft, setDraft] = useState<FieldListItem>({ label: '', type: 'text', required: false, options: null })

  const addField = () => {
    const label = draft.label.trim()
    if (!label) return
    onChange([...fields, {
      label,
      type: draft.type,
      required: draft.required,
      options: draft.type === 'select' && draft.options && draft.options.length > 0 ? draft.options : null,
    }])
    setDraft({ label: '', type: 'text', required: false, options: null })
  }

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index))
  }

  return (
    <div className={styles.fieldsEditor}>
      <h4>{title}</h4>
      {hint && <p className={styles.hint}>{hint}</p>}

      {fields.length > 0 && (
        <ul className={styles.fieldsList}>
          {fields.map((f, i) => (
            <li key={`${f.label}-${i}`} className={styles.fieldRow}>
              <span className={styles.fieldLabel}>{f.label}</span>
              <span className={styles.fieldType}>{f.type}{f.options ? ` (${f.options.length} opts)` : ''}{f.required ? ' *' : ''}</span>
              <button type="button" className={styles.removeBtn} onClick={() => removeField(i)} aria-label="Remove question">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.addFieldRow}>
        <input
          type="text"
          value={draft.label}
          onChange={e => setDraft({ ...draft, label: e.target.value })}
          placeholder={placeholder}
          className={styles.fieldInput}
        />
        <select
          value={draft.type}
          onChange={e => setDraft({ ...draft, type: e.target.value as FormFieldType })}
          className={styles.fieldSelect}
        >
          <option value="text">Short text</option>
          <option value="textarea">Long text</option>
          <option value="select">Dropdown</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="checkbox">Yes / No checkbox</option>
        </select>
        {draft.type === 'select' && (
          <textarea
            className={styles.fieldInput}
            value={(draft.options || []).join('\n')}
            onChange={e =>
              setDraft({
                ...draft,
                options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
              })
            }
            placeholder="Options (one per line)"
            rows={2}
            style={{ fontSize: '0.85rem' }}
          />
        )}
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={draft.required}
            onChange={e => setDraft({ ...draft, required: e.target.checked })}
          />
          Required
        </label>
        <button type="button" className={styles.addBtn} onClick={addField} disabled={!draft.label.trim()}>
          + Add
        </button>
      </div>
    </div>
  )
}