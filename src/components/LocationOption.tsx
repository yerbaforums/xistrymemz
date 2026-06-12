'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { geocodeLocation } from '@/lib/geocoding'
import styles from './LocationOption.module.css'

type LocationMode = 'passport' | 'custom' | 'global'

interface LocationOptionProps {
  value: { mode: LocationMode; text: string; latitude: number | null; longitude: number | null }
  onChange: (value: { mode: LocationMode; text: string; latitude: number | null; longitude: number | null }) => void
}

export default function LocationOption({ value, onChange }: LocationOptionProps) {
  const { data: session } = useSession()
  const [customText, setCustomText] = useState(value.text)
  const [geocoding, setGeocoding] = useState(false)
  const [passportLoc, setPassportLoc] = useState<{ text: string; lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!session?.user?.id || passportLoc) return
    fetch('/api/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const u = data?.user || data
        if (u?.latitude && u?.longitude) {
          setPassportLoc({ text: u.location || `${u.latitude.toFixed(4)}, ${u.longitude.toFixed(4)}`, lat: u.latitude, lng: u.longitude })
        }
      })
      .catch(() => {})
  }, [session?.user?.id, passportLoc])

  const handleModeChange = (mode: LocationMode) => {
    if (mode === 'passport' && passportLoc) {
      onChange({ mode, text: passportLoc.text, latitude: passportLoc.lat, longitude: passportLoc.lng })
    } else if (mode === 'global') {
      onChange({ mode, text: '', latitude: null, longitude: null })
    } else {
      onChange({ mode, text: customText, latitude: null, longitude: null })
    }
  }

  const handleCustomGeocode = async () => {
    if (!customText.trim()) return
    setGeocoding(true)
    try {
      const result = await geocodeLocation(customText)
      if (result) {
        onChange({ mode: 'custom', text: customText, latitude: result.latitude, longitude: result.longitude })
      }
    } catch {}
    setGeocoding(false)
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Location</label>
      <div className={styles.options}>
        <label className={`${styles.option} ${value.mode === 'passport' ? styles.active : ''}`}>
          <input type="radio" name="location-mode" checked={value.mode === 'passport'} onChange={() => handleModeChange('passport')} disabled={!passportLoc} />
          <span className={styles.optionLabel}>📍 Passport Location</span>
          {passportLoc && <span className={styles.optionDesc}>{passportLoc.text}</span>}
          {!passportLoc && <span className={styles.optionDesc}>Set your passport location in settings</span>}
        </label>
        <label className={`${styles.option} ${value.mode === 'custom' ? styles.active : ''}`}>
          <input type="radio" name="location-mode" checked={value.mode === 'custom'} onChange={() => handleModeChange('custom')} />
          <span className={styles.optionLabel}>📍 Custom Location</span>
          <div className={styles.customRow}>
            <input type="text" value={customText} onChange={e => { setCustomText(e.target.value); onChange({ ...value, mode: 'custom', text: e.target.value }) }} placeholder="City, address, or venue name" className={styles.customInput} />
            <button type="button" onClick={handleCustomGeocode} disabled={geocoding || !customText.trim()} className={styles.geocodeBtn}>{geocoding ? '...' : 'Set'}</button>
          </div>
        </label>
        <label className={`${styles.option} ${value.mode === 'global' ? styles.active : ''}`}>
          <input type="radio" name="location-mode" checked={value.mode === 'global'} onChange={() => handleModeChange('global')} />
          <span className={styles.optionLabel}>🌍 Global / N/A</span>
          <span className={styles.optionDesc}>Available everywhere, no specific location</span>
        </label>
      </div>
    </div>
  )
}
