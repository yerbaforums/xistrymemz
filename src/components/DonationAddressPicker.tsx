'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { DonationAddr } from '@/types/product'
import styles from './DonationAddressPicker.module.css'

const CURRENCIES = [
  { value: 'ETH', label: 'ETH (Ethereum)' },
  { value: 'BTC', label: 'BTC (Bitcoin)' },
  { value: 'USDT', label: 'USDT (Tether)' },
  { value: 'USDC', label: 'USDC (USD Coin)' },
  { value: 'XMR', label: 'XMR (Monero)' },
  { value: 'XTM', label: 'XTM (Tari)' },
  { value: 'ARRR', label: 'ARRR (Pirate)' },
  { value: 'DERO', label: 'DERO (Dero)' },
  { value: 'ZANO', label: 'ZANO (Zano)' },
  { value: 'FIRO', label: 'FIRO (Firo)' },
]

interface DonationAddressPickerProps {
  savedAddresses: DonationAddr[]
  selectedAddresses: DonationAddr[]
  onAddressesChange: (addresses: DonationAddr[]) => void
  allowCustom?: boolean
  allowSaveToProfile?: boolean
  label?: string
  disabled?: boolean
}

export default function DonationAddressPicker({
  savedAddresses,
  selectedAddresses,
  onAddressesChange,
  allowCustom = true,
  allowSaveToProfile = true,
  label = 'Donation Addresses',
  disabled = false,
}: DonationAddressPickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customCurrency, setCustomCurrency] = useState('ETH')
  const [customAddress, setCustomAddress] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [saveToProfile, setSaveToProfile] = useState(false)
  const [saving, setSaving] = useState(false)

  const hasSaved = savedAddresses.length > 0

  useEffect(() => {
    if (hasSaved && selectedAddresses.length === 0) {
      onAddressesChange(savedAddresses)
    }
  }, [hasSaved])

  const isSelected = (addr: DonationAddr) =>
    selectedAddresses.some(a => a.address === addr.address && a.currency === addr.currency)

  const handleToggle = (addr: DonationAddr) => {
    if (isSelected(addr)) {
      onAddressesChange(selectedAddresses.filter(a => !(a.address === addr.address && a.currency === addr.currency)))
    } else {
      onAddressesChange([...selectedAddresses, addr])
    }
  }

  const handleRemoveSelected = (addr: DonationAddr) => {
    onAddressesChange(selectedAddresses.filter(a => !(a.address === addr.address && a.currency === addr.currency)))
  }

  const handleAddCustom = async () => {
    if (!customAddress.trim()) return

    if (saveToProfile && allowSaveToProfile) {
      setSaving(true)
      try {
        const res = await fetch('/api/users/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency: customCurrency,
            address: customAddress.trim(),
            label: customLabel.trim() || null,
            isPublic: true,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const newAddr: DonationAddr = {
            id: data.donationAddress.id,
            currency: data.donationAddress.currency,
            address: data.donationAddress.address,
            label: data.donationAddress.label,
            qrCodeUrl: data.donationAddress.qrCodeUrl,
            showQR: data.donationAddress.showQR,
            sortOrder: data.donationAddress.sortOrder,
          }
          onAddressesChange([...selectedAddresses, newAddr])
          setShowCustom(false)
          setCustomAddress('')
          setCustomLabel('')
          setCustomCurrency('ETH')
          setSaveToProfile(false)
        }
      } catch {
        const customEntry: DonationAddr = {
          id: `custom-${Date.now()}`,
          currency: customCurrency,
          address: customAddress.trim(),
          label: customLabel.trim() || null,
          qrCodeUrl: null,
          showQR: true,
          sortOrder: 0,
        }
        onAddressesChange([...selectedAddresses, customEntry])
        setShowCustom(false)
        setCustomAddress('')
        setCustomLabel('')
      } finally {
        setSaving(false)
      }
    } else {
      const customEntry: DonationAddr = {
        id: `custom-${Date.now()}`,
        currency: customCurrency,
        address: customAddress.trim(),
        label: customLabel.trim() || null,
        qrCodeUrl: null,
        showQR: true,
        sortOrder: 0,
      }
      onAddressesChange([...selectedAddresses, customEntry])
      setShowCustom(false)
      setCustomAddress('')
      setCustomLabel('')
    }
  }

  return (
    <div className={styles.picker}>
      {label && <label className={styles.label}>{label}</label>}

      {hasSaved && (
        <div className={styles.chipGroup}>
          {savedAddresses.map(da => {
            const selected = isSelected(da)
            const shortAddr = da.address.length > 12
              ? da.address.slice(0, 4) + '...' + da.address.slice(-4)
              : da.address
            return (
              <button
                key={da.id}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(da)}
                className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                title={`${da.label || da.currency}: ${da.address}`}
              >
                <span className={styles.chipCurrency}>{da.currency}</span>
                <span>{da.label || shortAddr}</span>
              </button>
            )
          })}
          {allowCustom && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowCustom(!showCustom)}
              className={`${styles.chip} ${styles.chipAdd}`}
            >
              + Custom
            </button>
          )}
        </div>
      )}

      {!hasSaved && allowCustom && (
        <div className={styles.noAddrsRow}>
          <Link href="/profile/edit" className={styles.profileLink}>
            Manage saved addresses
          </Link>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowCustom(true)}
            className={styles.customToggle}
          >
            Or enter a custom address
          </button>
        </div>
      )}

      {!hasSaved && !allowCustom && (
        <p className={styles.noAddrs}>
          No donation addresses saved.{' '}
          <Link href="/profile/edit" style={{ color: 'var(--accent-primary)' }}>
            Add one in your profile settings
          </Link>
        </p>
      )}

      {showCustom && (
        <div className={styles.customFields}>
          <div className={styles.customRow}>
            <select
              value={customCurrency}
              onChange={e => setCustomCurrency(e.target.value)}
              disabled={disabled || saving}
              className={styles.currencySelect}
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={customAddress}
              onChange={e => setCustomAddress(e.target.value)}
              placeholder="Enter wallet address"
              disabled={disabled || saving}
              className={styles.addressInput}
            />
          </div>
          <input
            type="text"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
            placeholder="Label (optional, e.g. 'Main ETH Wallet')"
            disabled={disabled || saving}
            className={styles.labelInput}
          />
          {allowSaveToProfile && (
            <label className={styles.saveCheck}>
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={e => setSaveToProfile(e.target.checked)}
                disabled={disabled || saving}
              />
              Save this address to my profile for future use
            </label>
          )}
          <div className={styles.customActions}>
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customAddress.trim() || disabled || saving}
              className={styles.addCustomBtn}
            >
              {saving ? 'Saving...' : 'Add Address'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCustom(false); setCustomAddress(''); setCustomLabel('') }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedAddresses.length > 0 && (
        <div className={styles.selectedList}>
          {selectedAddresses.map(addr => {
            const shortAddr = addr.address.length > 16
              ? addr.address.slice(0, 6) + '...' + addr.address.slice(-4)
              : addr.address
            return (
              <div key={`${addr.currency}-${addr.address}`} className={styles.selectedItem}>
                <span className={styles.selectedCurrency}>{addr.currency}</span>
                <span className={styles.selectedAddr} title={addr.address}>
                  {addr.label || shortAddr}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(addr)}
                  className={styles.removeBtn}
                  disabled={disabled}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}