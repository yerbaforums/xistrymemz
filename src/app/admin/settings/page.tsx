'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { CRYPTO_LOGOS } from '@/lib/constants'

interface SiteSettings {
  enableCheckout: boolean
  enableWallet: boolean
  platformFeePercent: number
  donationAddresses: DonationAddr[]
}

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrUrl?: string | null
  showQR: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    enableCheckout: true,
    enableWallet: true,
    platformFeePercent: 10,
    donationAddresses: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [showDonationForm, setShowDonationForm] = useState(false)
  const [editingDonation, setEditingDonation] = useState<DonationAddr | null>(null)
  const [donationForm, setDonationForm] = useState({ currency: 'XTM', address: '', label: '', showQR: true })

  const [feePercent, setFeePercent] = useState(10)
  const [directFeePercent, setDirectFeePercent] = useState(5)
  const [savingFee, setSavingFee] = useState(false)
  const [qrAddress, setQrAddress] = useState<string | null>(null)

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
          enableWallet: data.enableWallet,
          platformFeePercent: data.platformFeePercent,
          donationAddresses: data.donationAddresses || []
        })
        setFeePercent(data.platformFeePercent || 10)
        setDirectFeePercent(Math.round((data.platformFeePercent || 10) / 2))
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFees = async () => {
    setSavingFee(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformFeePercent: feePercent })
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, platformFeePercent: feePercent }))
        setDirectFeePercent(Math.round(feePercent / 2))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save fee:', error)
    } finally {
      setSavingFee(false)
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

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donationForm.address.trim()) return

    setSaving(true)
    const newAddr: DonationAddr = {
      id: editingDonation?.id || `da-${Date.now()}`,
      currency: donationForm.currency,
      address: donationForm.address,
      label: donationForm.label || null,
      showQR: donationForm.showQR
    }

    const updated = editingDonation
      ? settings.donationAddresses.map(da => da.id === editingDonation.id ? newAddr : da)
      : [...settings.donationAddresses, newAddr]

    setSettings(prev => ({ ...prev, donationAddresses: updated }))
    setSaving(true)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationAddresses: updated })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      console.error('Failed to save donation address')
    } finally {
      setSaving(false)
      setShowDonationForm(false)
      setEditingDonation(null)
      setDonationForm({ currency: 'XTM', address: '', label: '', showQR: true })
    }
  }

  const handleDeleteDonation = async (id: string) => {
    if (!confirm('Delete this donation address?')) return

    const updated = settings.donationAddresses.filter(da => da.id !== id)
    setSettings(prev => ({ ...prev, donationAddresses: updated }))

    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationAddresses: updated })
      })
    } catch {
      console.error('Failed to delete donation address')
      fetchSettings()
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

      <div className={styles.section}>
        <h2>Platform Fees</h2>
        <p className={styles.description}>
          Set the platform fee percentage for escrow transactions. Direct payment fees are automatically calculated at half the escrow rate.
        </p>

        <div className={styles.feeEditor}>
          <div className={styles.feeInputs}>
            <div className={styles.feeField}>
              <label className={styles.feeLabel}>Escrow Fee (%)</label>
              <input
                type="number"
                value={feePercent}
                onChange={e => setFeePercent(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                className={styles.feeInput}
                min={0}
                max={50}
                step={0.5}
                disabled={savingFee}
              />
            </div>
            <div className={styles.feeField}>
              <label className={styles.feeLabel}>Direct Fee (%)</label>
              <input
                type="text"
                value={directFeePercent}
                className={`${styles.feeInput} ${styles.feeInputDisabled}`}
                disabled
                title="Automatically calculated as half the escrow fee"
              />
            </div>
          </div>
          <button
            onClick={handleSaveFees}
            disabled={savingFee}
            className={styles.feeSaveBtn}
          >
            {savingFee ? 'Saving...' : 'Save Fees'}
          </button>
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

      {/* Site Donation Addresses */}
      <div className={styles.section} style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ marginBottom: '4px' }}>Site Donation Addresses</h2>
            <p className={styles.description} style={{ marginBottom: 0 }}>
              Crypto addresses displayed on the home page, about page, and footer for site-wide donations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowDonationForm(true); setEditingDonation(null); setDonationForm({ currency: 'XTM', address: '', label: '', showQR: true }) }}
            className={styles.addBtn}
          >
            + Add Address
          </button>
        </div>

        {settings.donationAddresses.length === 0 && !showDonationForm && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
            No donation addresses configured. Add XTM, XMR, or other crypto addresses.
          </p>
        )}

        {settings.donationAddresses.map(da => {
          const shortAddr = da.address.length > 14
            ? da.address.slice(0, 6) + '...' + da.address.slice(-4)
            : da.address
          const logoPath = `/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`

          return (
            <div key={da.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
              background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '8px',
              border: '1px solid var(--border-color)', cursor: 'pointer'
            }} onClick={() => setQrAddress(da.address)}>
              <img src={logoPath} alt={da.currency} width={20} height={20} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{da.label || da.currency}</span>
                  {!da.showQR && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(QR hidden)</span>}
                </div>
                <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} title={da.address}>{shortAddr}</code>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => { setEditingDonation(da); setDonationForm({ currency: da.currency, address: da.address, label: da.label || '', showQR: da.showQR }); setShowDonationForm(true) }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                <button onClick={() => handleDeleteDonation(da.id)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
              </div>
            </div>
          )
        })}

        {showDonationForm && (
          <form onSubmit={handleSaveDonation} style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>{editingDonation ? 'Edit Address' : 'Add Donation Address'}</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Currency</label>
              <select
                value={donationForm.currency}
                onChange={e => setDonationForm({ ...donationForm, currency: e.target.value })}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              >
                <option value="XTM">XTM (Tari)</option>
                <option value="XMR">XMR (Monero)</option>
                <option value="ETH">ETH (Ethereum)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Address</label>
              <input
                type="text"
                value={donationForm.address}
                onChange={e => setDonationForm({ ...donationForm, address: e.target.value })}
                placeholder={`Enter ${donationForm.currency} address...`}
                required
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Label (optional)</label>
              <input
                type="text"
                value={donationForm.label}
                onChange={e => setDonationForm({ ...donationForm, label: e.target.value })}
                placeholder="e.g., Main Wallet, Community Fund..."
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={donationForm.showQR} onChange={e => setDonationForm({ ...donationForm, showQR: e.target.checked })} />
                <span>Show QR code</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowDonationForm(false); setEditingDonation(null) }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>{saving ? 'Saving...' : (editingDonation ? 'Update' : 'Add')}</button>
            </div>
          </form>
        )}
      </div>

      {qrAddress && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrAddress(null)}
          currency="Donation"
          address={qrAddress}
        />
      )}
    </div>
  )
}
