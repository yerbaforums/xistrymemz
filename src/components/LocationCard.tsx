'use client'

import styles from './LocationCard.module.css'

interface LocationCardProps {
  homeCoords: [number, number] | null
  homeName: string
  passportLocName?: string | null
  settingLocation: boolean
  onSetLocation: () => void
  onDetect: () => void
  onFlyHome: () => void
}

export default function LocationCard({
  homeCoords,
  homeName,
  passportLocName,
  settingLocation,
  onSetLocation,
  onDetect,
  onFlyHome,
}: LocationCardProps) {
  const displayName = homeName || passportLocName || 'Not set — click the map to set your home base'
  return (
    <div className={styles.locationCard}>
      <div className={styles.locationInfo}>
        <span className={styles.locationIcon}>🏠</span>
        <div>
          <div className={styles.locationLabel}>Your Location</div>
          <div className={styles.locationName}>{displayName}</div>
        </div>
      </div>
      <div className={styles.locationActions}>
        <button
          className={`${styles.locBtn} ${settingLocation ? styles.locBtnActive : ''}`}
          onClick={onSetLocation}
        >
          {settingLocation ? '✕ Cancel' : '📍 Set on Map'}
        </button>
        <button className={styles.locBtn} onClick={onDetect}>
          📡 Detect
        </button>
        {homeCoords && (
          <button className={styles.locBtn} onClick={onFlyHome}>
            ✈️ Fly Home
          </button>
        )}
      </div>
    </div>
  )
}
