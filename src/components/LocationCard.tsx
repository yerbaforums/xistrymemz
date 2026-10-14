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
  /** Passport Traveling mode — shows a ✈️ badge instead of 🏠. */
  traveling?: boolean
  /** Near Me filter state (results within `radiusKm` of this location). */
  nearMe?: boolean
  onNearMeChange?: (v: boolean) => void
  radiusKm?: number
  onRadiusKmChange?: (v: number) => void
}

const RADIUS_OPTIONS = [10, 25, 50, 100, 250, 500]

export default function LocationCard({
  homeCoords,
  homeName,
  passportLocName,
  settingLocation,
  onSetLocation,
  onDetect,
  onFlyHome,
  traveling = false,
  nearMe = false,
  onNearMeChange,
  radiusKm = 50,
  onRadiusKmChange,
}: LocationCardProps) {
  const displayName = homeName || passportLocName || 'Not set — click the map to set your home base'
  const hasCoords = homeCoords != null

  return (
    <div className={styles.locationCard}>
      <div className={styles.locationInfo}>
        <span className={styles.locationIcon}>{traveling ? '✈️' : '🏠'}</span>
        <div>
          <div className={styles.locationLabel}>
            {traveling ? 'Current Location · Traveling' : 'Your Location'}
          </div>
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
        {onNearMeChange && hasCoords && (
          <label
            className={styles.nearMeToggle}
            title={`Show only listings within ${radiusKm} km of this location`}
          >
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={nearMe}
                onChange={e => onNearMeChange(e.target.checked)}
                aria-label="Filter results to near me"
              />
              <span className="toggle-slider" />
            </span>
            📍 Near Me
            {onRadiusKmChange && (
              <select
                className={styles.radiusSelect}
                value={radiusKm}
                onChange={e => onRadiusKmChange(Number(e.target.value))}
                onClick={e => e.stopPropagation()}
                aria-label="Near me radius in kilometers"
                disabled={!nearMe}
              >
                {RADIUS_OPTIONS.map(r => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            )}
          </label>
        )}
      </div>
    </div>
  )
}
