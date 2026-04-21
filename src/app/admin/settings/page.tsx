'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'

interface SiteSettings {
  enableCheckout: boolean
  enableWallet: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    enableCheckout: true,
    enableWallet: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          enableCheckout: data.enableCheckout,
          enableWallet: data.enableWallet
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: 'enableCheckout' | 'enableWallet') => {
    const newValue = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newValue }))
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save setting:', error)
      setSettings(prev => ({ ...prev, [key]: !newValue }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading settings...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Platform Settings</h1>
          <p className={styles.subtitle}>Configure platform features and availability</p>
        </div>
        {saved && (
          <span className={styles.savedBadge}>Saved!</span>
        )}
      </div>

      <div className={styles.section}>
        <h2>Feature Toggles</h2>
        <p className={styles.description}>
          Use these toggles to enable or disable major platform features. Disabled features will be hidden from the UI with a &quot;Coming Soon&quot; indicator.
        </p>

        <div className={styles.toggleList}>
          <div className={styles.toggleItem}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Checkout & Cart</span>
              <span className={styles.toggleDescription}>
                Enable the shopping cart and checkout functionality. When disabled, users will see &quot;Coming Soon&quot; on the cart button.
              </span>
            </div>
            <button
              className={`${styles.toggle} ${settings.enableCheckout ? styles.active : ''}`}
              onClick={() => !saving && handleToggle('enableCheckout')}
              disabled={saving}
              aria-pressed={settings.enableCheckout}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>

          <div className={styles.toggleItem}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Wallet</span>
              <span className={styles.toggleDescription}>
                Enable the cryptocurrency wallet feature. When disabled, users will see &quot;Coming Soon&quot; on the wallet page link.
              </span>
            </div>
            <button
              className={`${styles.toggle} ${settings.enableWallet ? styles.active : ''}`}
              onClick={() => !saving && handleToggle('enableWallet')}
              disabled={saving}
              aria-pressed={settings.enableWallet}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.status}>
        <h3>Current Status</h3>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Checkout</span>
            <span className={`${styles.statusValue} ${settings.enableCheckout ? styles.enabled : styles.disabled}`}>
              {settings.enableCheckout ? '🟢 Enabled' : '🔴 Disabled'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Wallet</span>
            <span className={`${styles.statusValue} ${settings.enableWallet ? styles.enabled : styles.disabled}`}>
              {settings.enableWallet ? '🟢 Enabled' : '🔴 Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}