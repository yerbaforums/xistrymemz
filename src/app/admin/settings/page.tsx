'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { getAllCryptos, getCryptoIcon, getCryptoName } from '@/lib/crypto-icons'
import Breadcrumbs from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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
  sortOrder?: number
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
  const [donationForm, setDonationForm] = useState({ currency: 'ETH', address: '', label: '', showQR: true })

  const [feePercent, setFeePercent] = useState(10)
  const [directFeePercent, setDirectFeePercent] = useState(5)
  const [savingFee, setSavingFee] = useState(false)
  const [qrAddress, setQrAddress] = useState<string | null>(null)
  const [qrDonationCurrency, setQrDonationCurrency] = useState<string | null>(null)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const allCryptos = getAllCryptos()

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

    const existingAddr = settings.donationAddresses.find(
      da => da.currency === donationForm.currency && 
            da.address.trim() === donationForm.address.trim() &&
            !editingDonation
    )

    if (existingAddr) {
      setSaving(false)
      alert(`This ${donationForm.currency} address already exists in your donation list.`)
      return
    }

    const newAddr: DonationAddr = {
      id: editingDonation?.id || `da-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      currency: donationForm.currency,
      address: donationForm.address.trim(),
      label: donationForm.label || null,
      showQR: donationForm.showQR,
      sortOrder: editingDonation?.sortOrder ?? settings.donationAddresses.length
    }

    const updated = editingDonation
      ? settings.donationAddresses.map(da => da.id === editingDonation.id ? newAddr : da)
      : [...settings.donationAddresses, newAddr]

    setSettings(prev => ({ ...prev, donationAddresses: updated }))

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationAddresses: updated })
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(prev => ({ 
          ...prev, 
          donationAddresses: data.donationAddresses || updated 
        }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        await fetchSettings()
      }
    } catch {
      console.error('Failed to save donation address')
      await fetchSettings()
    } finally {
      setSaving(false)
      setShowDonationForm(false)
      setEditingDonation(null)
      setDonationForm({ currency: 'ETH', address: '', label: '', showQR: true })
    }
  }

  const handleDeleteDonation = async (id: string) => {

    const updated = settings.donationAddresses.filter(da => da.id !== id)
    setSettings(prev => ({ ...prev, donationAddresses: updated }))

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationAddresses: updated })
      })
      if (!res.ok) {
        await fetchSettings()
      }
    } catch {
      await fetchSettings()
    }
  }

  const handleReorderDonations = async (draggedIndex: number, targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const newAddresses = [...settings.donationAddresses]
    const [draggedItem] = newAddresses.splice(draggedIndex, 1)
    newAddresses.splice(targetIndex, 0, draggedItem)
    const reordered = newAddresses.map((da, i) => ({ ...da, sortOrder: i }))
    setSettings(prev => ({ ...prev, donationAddresses: reordered }))
    setDraggedIdx(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationAddresses: reordered })
      })
      if (!res.ok) {
        await fetchSettings()
      }
    } catch {
      await fetchSettings()
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading settings...</div>
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Settings' }]} />
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
      <div className={`${styles.section} ${styles.mt24}`}>
        <div className={styles.formRow}>
          <div>
            <h2 className={styles.mb4}>Site Donation Addresses</h2>
            <p className={`${styles.description} ${styles.mb0}`}>
              Crypto addresses displayed on the home page, about page, and footer for site-wide donations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowDonationForm(true); setEditingDonation(null); setDonationForm({ currency: 'ETH', address: '', label: '', showQR: true }) }}
            className={styles.addBtn}
          >
            + Add Address
          </button>
        </div>

        {settings.donationAddresses.length === 0 && !showDonationForm && (
          <p className={styles.emptyState}>
            No donation addresses configured. Add BTC, ETH, XMR, or other crypto addresses.
          </p>
        )}

        {settings.donationAddresses.map((da, idx) => {
          const cryptoName = getCryptoName(da.currency)
          const iconUrl = getCryptoIcon(da.currency)
          const shortAddr = da.address.length > 14
            ? da.address.slice(0, 6) + '...' + da.address.slice(-4)
            : da.address

          return (
            <div key={da.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); setDraggedIdx(idx) }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                handleReorderDonations(draggedIndex, idx)
              }}
              className={styles.donationCard}
              onClick={() => { setQrAddress(da.address); setQrDonationCurrency(da.currency) }}
            >
              <div className={styles.dragHandle} title="Drag to reorder">
                ⠿
              </div>
              {iconUrl ? (
                <img src={iconUrl} alt={cryptoName} width={20} height={20} className={styles.cryptoIcon} />
              ) : (
                <span className={styles.cryptoFallback}>{da.currency.substring(0, 2).toUpperCase()}</span>
              )}
              <div className={styles.donationRow}>
                <div className={styles.donationInfo}>
                  <span className={styles.donationLabel}>{da.label || cryptoName}</span>
                  {!da.showQR && <span className={styles.donationQrHidden}>(QR hidden)</span>}
                </div>
                <code className={styles.donationAddr} title={da.address}>{shortAddr}</code>
              </div>
              <div className={styles.donationActions} onClick={e => e.stopPropagation()}>
                <button onClick={() => { setEditingDonation(da); setDonationForm({ currency: da.currency, address: da.address, label: da.label || '', showQR: da.showQR }); setShowDonationForm(true) }} className={styles.editBtn}>Edit</button>
                <button onClick={() => handleDeleteDonation(da.id)} className={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          )
        })}

        {showDonationForm && (
          <form onSubmit={handleSaveDonation} className={styles.donationForm}>
            <h3 className={styles.formTitle}>{editingDonation ? 'Edit Address' : 'Add Donation Address'}</h3>

            <div className={styles.mb12}>
              <label className={styles.formLabel}>Currency</label>
              <div className={styles.cryptoGrid}>
                {allCryptos.map(crypto => (
                  <button
                    key={crypto.id}
                    type="button"
                    onClick={() => setDonationForm({ ...donationForm, currency: crypto.id })}
                    className={`${styles.cryptoBtnBase} ${donationForm.currency === crypto.id ? styles.cryptoBtnActive : ''}`}
                  >
                    {crypto.icon && <img src={crypto.icon} alt="" width={14} height={14} className={styles.cryptoBtnIcon} />}
                    {crypto.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mb12}>
              <label className={styles.formLabel}>Address</label>
              <input
                type="text"
                value={donationForm.address}
                onChange={e => setDonationForm({ ...donationForm, address: e.target.value })}
                placeholder={`Enter ${donationForm.currency} address...`}
                required
                className={styles.formInput}
              />
            </div>

            <div className={styles.mb12}>
              <label className={styles.formLabel}>Label (optional)</label>
              <input
                type="text"
                value={donationForm.label}
                onChange={e => setDonationForm({ ...donationForm, label: e.target.value })}
                placeholder="e.g., Main Wallet, Community Fund..."
                className={styles.formInput}
              />
            </div>

            <div className={styles.mb12}>
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={donationForm.showQR} onChange={e => setDonationForm({ ...donationForm, showQR: e.target.checked })} />
                <span>Show QR code</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => { setShowDonationForm(false); setEditingDonation(null) }} className={styles.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} className={styles.submitBtn}>{saving ? 'Saving...' : (editingDonation ? 'Update' : 'Add')}</button>
            </div>
          </form>
        )}
      </div>

      {qrAddress && (
        <QRCodeModal
          isOpen={true}
          onClose={() => { setQrAddress(null); setQrDonationCurrency(null) }}
          currency={qrDonationCurrency || 'Donation'}
          address={qrAddress}
        />
      )}


      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { handleDeleteDonation(deleteTarget); setDeleteTarget(null) }}
        title="Delete Donation Address"
        message="Delete this donation address?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
