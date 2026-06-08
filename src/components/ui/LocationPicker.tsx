'use client'

import { useState } from 'react'
import { reverseGeocodeLocation } from '@/lib/geocoding'
import styles from './LocationPicker.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
}

export default function LocationPicker({
  value,
  onChange,
  label,
  placeholder = 'Enter a location',
  required = false,
  className = '',
  error,
}: Props) {
  const [detecting, setDetecting] = useState(false)

  async function handleDetect() {
    if (!navigator.geolocation) return
    setDetecting(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      )
      const displayName = await reverseGeocodeLocation(
        pos.coords.latitude,
        pos.coords.longitude
      )
      if (displayName) onChange(displayName)
    } catch {
      // user denied or error
    } finally {
      setDetecting(false)
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
      <div className={styles.inputRow}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`${styles.input} ${error ? styles.error : ''}`}
        />
        <button
          type="button"
          className={styles.detectBtn}
          onClick={handleDetect}
          disabled={detecting}
          title="Detect current location"
        >
          {detecting ? '⌛' : '📍'}
        </button>
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
