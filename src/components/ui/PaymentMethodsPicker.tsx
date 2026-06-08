'use client'

import styles from './PaymentMethodsPicker.module.css'

const OPTIONS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'card', label: 'Card' },
]

interface Props {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  required?: boolean
  max?: number
  className?: string
}

export default function PaymentMethodsPicker({
  value,
  onChange,
  label,
  required = false,
  max,
  className = '',
}: Props) {
  function toggle(option: string) {
    const selected = value.includes(option)
    if (selected) {
      onChange(value.filter((v) => v !== option))
    } else {
      if (max && value.length >= max) return
      onChange([...value, option])
    }
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.chips}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.chip} ${value.includes(opt.value) ? styles.selected : ''}`}
            onClick={() => toggle(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
