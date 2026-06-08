'use client'

import styles from './PriceInput.module.css'

interface Props {
  value: number | string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  className?: string
  error?: string
}

export default function PriceInput({
  value,
  onChange,
  label,
  placeholder = '0.00',
  required = false,
  disabled = false,
  min,
  max,
  className = '',
  error,
}: Props) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.error : ''} ${disabled ? styles.disabled : ''}`}>
        <span className={styles.prefix}>$</span>
        <input
          type="number"
          step="0.01"
          min={min ?? 0}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={styles.input}
        />
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
