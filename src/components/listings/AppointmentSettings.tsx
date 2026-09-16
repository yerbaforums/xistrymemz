'use client'

import { useState } from 'react'
import type { FormFieldType } from '@/types/service'
import styles from './AppointmentSettings.module.css'

export interface AppointmentField {
  label: string
  type: FormFieldType
  required: boolean
  options?: string[] | null
}

export interface AppointmentSettingsValue {
  acceptsAppointments: boolean
  appointmentDuration: string
  appointmentLeadTime: string
  appointmentLocation: string
  appointmentMeetingLink: string
  appointmentFormFields: AppointmentField[]
}

export interface AppointmentSettingsProps {
  value: AppointmentSettingsValue
  onChange: (value: AppointmentSettingsValue) => void
  defaultDurationLabel?: string
  defaultLocationLabel?: string
  defaultMeetingLinkLabel?: string
}

export function AppointmentSettings({
  value,
  onChange,
  defaultDurationLabel,
  defaultLocationLabel,
  defaultMeetingLinkLabel,
}: AppointmentSettingsProps) {
  const [fieldDraft, setFieldDraft] = useState<AppointmentField>({ label: '', type: 'text', required: false })

  const set = (patch: Partial<AppointmentSettingsValue>) => onChange({ ...value, ...patch })

  const addField = () => {
    const label = fieldDraft.label.trim()
    if (!label) return
    set({
      appointmentFormFields: [
        ...value.appointmentFormFields,
        {
          label,
          type: fieldDraft.type,
          required: fieldDraft.required,
          options: fieldDraft.type === 'select' && fieldDraft.options && fieldDraft.options.length > 0
            ? fieldDraft.options
            : null,
        },
      ],
    })
    setFieldDraft({ label: '', type: 'text', required: false, options: null })
  }

  const removeField = (index: number) => {
    set({ appointmentFormFields: value.appointmentFormFields.filter((_, i) => i !== index) })
  }

  return (
    <div className={styles.block}>
      <label className={styles.checkLabel}>
        <input
          type="checkbox"
          checked={value.acceptsAppointments}
          onChange={e => set({ acceptsAppointments: e.target.checked })}
        />
        Accept Appointments / Bookings
      </label>

      {value.acceptsAppointments && (
        <div className={styles.fields}>
          <div className={styles.row}>
            <div className={styles.group}>
              <label>Default Session Duration (min)</label>
              <input
                type="number"
                value={value.appointmentDuration}
                onChange={e => set({ appointmentDuration: e.target.value })}
                placeholder={defaultDurationLabel || '60'}
                min={5}
                step={5}
              />
              {defaultDurationLabel && (
                <small>Leave blank to use {defaultDurationLabel}</small>
              )}
            </div>
            <div className={styles.group}>
              <label>Minimum Lead Time (hours)</label>
              <input
                type="number"
                value={value.appointmentLeadTime}
                onChange={e => set({ appointmentLeadTime: e.target.value })}
                placeholder="24"
                min={0}
              />
              <small>How far in advance bookings must be made</small>
            </div>
          </div>

          <div className={styles.group}>
            <label>Appointment Location Override</label>
            <input
              type="text"
              value={value.appointmentLocation}
              onChange={e => set({ appointmentLocation: e.target.value })}
              placeholder={defaultLocationLabel || 'Location for in-person meetings'}
            />
            {defaultLocationLabel && (
              <small>Leave blank to use {defaultLocationLabel}</small>
            )}
          </div>

          <div className={styles.group}>
            <label>Appointment Meeting Link Override</label>
            <input
              type="url"
              value={value.appointmentMeetingLink}
              onChange={e => set({ appointmentMeetingLink: e.target.value })}
              placeholder={defaultMeetingLinkLabel || 'https://...'}
            />
            {defaultMeetingLinkLabel && (
              <small>Leave blank to use {defaultMeetingLinkLabel}</small>
            )}
          </div>

          <div className={styles.fieldsEditor}>
            <h4>Customer Intake Questions</h4>
            <p className={styles.hint}>
              Questions buyers must answer when booking. Great for specs, allergies, goals, or addresses.
            </p>

            {value.appointmentFormFields.length > 0 && (
              <ul className={styles.fieldsList}>
                {value.appointmentFormFields.map((f, i) => (
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
                value={fieldDraft.label}
                onChange={e => setFieldDraft({ ...fieldDraft, label: e.target.value })}
                placeholder="Question label (e.g. What size?)"
                className={styles.fieldInput}
              />
              <select
                value={fieldDraft.type}
                onChange={e => setFieldDraft({ ...fieldDraft, type: e.target.value as FormFieldType })}
                className={styles.fieldSelect}
              >
                <option value="text">Short text</option>
                <option value="textarea">Long text</option>
                <option value="select">Dropdown</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="checkbox">Yes / No checkbox</option>
              </select>
              {fieldDraft.type === 'select' && (
                <textarea
                  className={styles.fieldInput}
                  value={(fieldDraft.options || []).join('\n')}
                  onChange={e =>
                    setFieldDraft({
                      ...fieldDraft,
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
                  checked={fieldDraft.required}
                  onChange={e => setFieldDraft({ ...fieldDraft, required: e.target.checked })}
                />
                Required
              </label>
              <button type="button" className={styles.addBtn} onClick={addField} disabled={!fieldDraft.label.trim()}>
                + Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}