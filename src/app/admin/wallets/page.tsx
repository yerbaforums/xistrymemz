'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { getCryptoIcon } from '@/lib/crypto-icons'

function Breadcrumbs() {
  return (
    <nav className="breadcrumbs">
      <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
      <span className="breadcrumb-sep">/</span>
      <span className="breadcrumb-current">Admin</span>
      <span className="breadcrumb-sep">/</span>
      <span className="breadcrumb-current">Wallets</span>
    </nav>
  )
}

interface AdminWallet {
  id: string
  cryptoType: string
  cryptoName: string
  address: string
  privateKey?: string
  seedPhrase?: string
  isPrimary: boolean
  label?: string
  createdAt: string
  userId?: string
  adminName?: string
}

interface UserWallet {
  id: string
  cryptoType: string
  address: string
  isPrimary: boolean
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

interface CryptoType {
  value: string
  label: string
}

type SortField = 'cryptoType' | 'address' | 'createdAt' | 'user' | 'isPrimary' | 'admin'
type SortDir = 'asc' | 'desc'

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<AdminWallet[]>([])
  const [userWallets, setUserWallets] = useState<UserWallet[]>([])
  const [cryptoTypes, setCryptoTypes] = useState<CryptoType[]>([])
  const [selectedCrypto, setSelectedCrypto] = useState('ETH')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [platformFeePercent, setPlatformFeePercent] = useState(10)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [platformWallet, setPlatformWallet] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keyToView, setKeyToView] = useState<string | null>(null)
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [userWalletSelectAll, setUserWalletSelectAll] = useState(false)
  const [selectedUserWallets, setSelectedUserWallets] = useState<Set<string>>(new Set())
  const [showKeyWarning, setShowKeyWarning] = useState(false)
  const [viewedData, setViewedData] = useState<{type: 'key' | 'seed', data: string} | null>(null)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFullAddress, setShowFullAddress] = useState<string | null>(null)
  const [setAsPrimary, setSetAsPrimary] = useState(false)
  const [escrowFee, setEscrowFee] = useState(10)

  useEffect(() => {
    fetchWallets()
  }, [])

  async function fetchWallets() {
    try {
      const [adminRes, userRes] = await Promise.all([
        fetch('/api/admin/wallets'),
        fetch('/api/admin/wallets?userWallets=true')
      ])
      
      const adminData = await adminRes.json()
      if (adminData.wallets) setWallets(adminData.wallets)
      if (adminData.cryptoTypes) setCryptoTypes(adminData.cryptoTypes)
      if (adminData.platformFeePercent) {
        setPlatformFeePercent(adminData.platformFeePercent)
        setEscrowFee(adminData.platformFeePercent)
      }
      if (adminData.platformWallet) setPlatformWallet(adminData.platformWallet)
      
      const userData = await userRes.json()
      if (userData.wallets) setUserWallets(userData.wallets)
    } catch (error) {
      console.error('Failed to fetch wallets:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateWallet() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', cryptoType: selectedCrypto })
      })
      const data = await res.json()
      if (data.success && data.wallet) {
        setWallets(prev => [data.wallet, ...prev])
        alert(`Wallet generated for ${data.wallet.cryptoName}!`)
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to generate wallet:', error)
      alert('Failed to generate wallet')
    } finally {
      setSaving(false)
    }
  }

  async function deleteWallet(walletId: string) {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet) return

    const confirmed = confirm(
      `Are you sure you want to delete this ${wallet.cryptoName} wallet?\n\n` +
      `Address: ${wallet.address}\n\n` +
      `⚠️ WARNING: If this wallet has funds, make sure you have backed up the seed phrase/private key before deleting!\n\n` +
      `Click OK to delete, or Cancel to keep the wallet.`
    )

    if (!confirmed) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', walletId })
      })
      const data = await res.json()
      if (data.success) {
        setWallets(prev => prev.filter(w => w.id !== walletId))
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to delete wallet:', error)
      alert('Failed to delete wallet')
    } finally {
      setSaving(false)
    }
  }

  async function setPrimaryWallet(walletId: string) {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet) return
    
    const coinPrimaryCount = wallets.filter(w => w.cryptoType === wallet.cryptoType && w.isPrimary).length
    
    if (coinPrimaryCount > 0 && !wallet.isPrimary) {
      if (!confirm(`This coin (${wallet.cryptoType}) already has a primary wallet. Replace it with this one?`)) {
        return
      }
    }
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPrimary', walletId, cryptoType: wallet.cryptoType })
      })
      const data = await res.json()
      if (data.success) {
        setWallets(prev => prev.map(w => ({
          ...w,
          isPrimary: w.cryptoType === wallet.cryptoType ? w.id === walletId : w.isPrimary
        })))
        alert('Primary wallet updated!')
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to set primary wallet:', error)
      alert('Failed to set primary wallet')
    } finally {
      setSaving(false)
    }
  }

  function requestViewKey(walletId: string) {
    setKeyToView(walletId)
    setShowKeyWarning(true)
  }

  async function viewPrivateKey() {
    if (!keyToView) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'viewPrivateKey', walletId: keyToView })
      })
      const data = await res.json()
      if (data.success && data.privateKey) {
        setViewedData({ type: 'key', data: data.privateKey })
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to view private key:', error)
      alert('Failed to view private key')
    } finally {
      setSaving(false)
      setShowKeyWarning(false)
    }
  }

  async function viewSeedPhrase() {
    if (!keyToView) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'viewSeedPhrase', walletId: keyToView })
      })
      const data = await res.json()
      if (data.success && data.seedPhrase) {
        setViewedData({ type: 'seed', data: data.seedPhrase })
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to view seed phrase:', error)
      alert('Failed to view seed phrase')
    } finally {
      setSaving(false)
      setShowKeyWarning(false)
    }
  }

  function toggleSelectForDelete(walletId: string) {
    const newSelected = new Set(selectedWallets)
    if (newSelected.has(walletId)) {
      newSelected.delete(walletId)
    } else {
      newSelected.add(walletId)
    }
    setSelectedWallets(newSelected)
    setSelectAll(newSelected.size === wallets.length)
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedWallets(new Set())
      setSelectAll(false)
    } else {
      setSelectedWallets(new Set(wallets.map(w => w.id)))
      setSelectAll(true)
    }
  }

  async function deleteSelectedWallets() {
    if (selectedWallets.size === 0) return

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedWallets.size} wallet(s)?\n\n` +
      `⚠️ WARNING: If these wallets have funds, make sure you have backed up the seed phrases before deleting!`
    )

    if (!confirmed) return

    setSaving(true)
    try {
      for (const walletId of selectedWallets) {
        await fetch('/api/admin/wallets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', walletId })
        })
      }
      setWallets(prev => prev.filter(w => !selectedWallets.has(w.id)))
      setSelectedWallets(new Set())
      setSelectAll(false)
      alert(`${selectedWallets.size} wallet(s) deleted successfully!`)
    } catch (error) {
      console.error('Failed to delete wallets:', error)
      alert('Failed to delete wallets')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelectedUserWallets() {
    if (selectedUserWallets.size === 0) return

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedUserWallets.size} user wallet(s)?\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    setSaving(true)
    try {
      for (const walletId of selectedUserWallets) {
        await fetch('/api/admin/wallets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteUserWallet', walletId })
        })
      }
      setUserWallets(prev => prev.filter(w => !selectedUserWallets.has(w.id)))
      setSelectedUserWallets(new Set())
      setUserWalletSelectAll(false)
      alert(`${selectedUserWallets.size} user wallet(s) deleted successfully!`)
    } catch (error) {
      console.error('Failed to delete user wallets:', error)
      alert('Failed to delete user wallets')
    } finally {
      setSaving(false)
    }
  }

  async function saveFee() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformFeePercent: escrowFee })
      })
      const data = await res.json()
      if (data.success) {
        alert('Escrow fee updated successfully!')
      }
    } catch (error) {
      console.error('Failed to save fee:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedWallets = [...wallets].sort((a, b) => {
    let aVal: string | boolean = ''
    let bVal: string | boolean = ''
    
    if (sortField === 'cryptoType') {
      aVal = a.cryptoType
      bVal = b.cryptoType
    } else if (sortField === 'address') {
      aVal = a.address
      bVal = b.address
    } else if (sortField === 'createdAt') {
      aVal = a.createdAt
      bVal = b.createdAt
    } else if (sortField === 'isPrimary') {
      aVal = a.isPrimary
      bVal = b.isPrimary
    } else if (sortField === 'admin') {
      aVal = a.adminName || ''
      bVal = b.adminName || ''
    }
    
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return sortDir === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1)
    }
    
    return sortDir === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  const sortedUserWallets = [...userWallets].sort((a, b) => {
    let aVal: string | boolean = ''
    let bVal: string | boolean = ''
    
    if (sortField === 'cryptoType') {
      aVal = a.cryptoType
      bVal = b.cryptoType
    } else if (sortField === 'address') {
      aVal = a.address
      bVal = b.address
    } else if (sortField === 'createdAt') {
      aVal = a.createdAt
      bVal = b.createdAt
    } else if (sortField === 'user') {
      aVal = a.user.name || a.user.email
      bVal = b.user.name || b.user.email
    } else if (sortField === 'isPrimary') {
      aVal = a.isPrimary
      bVal = b.isPrimary
    }
    
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return sortDir === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1)
    }
    
    return sortDir === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  const formatAddress = (address: string, showFull: boolean) => {
    if (showFull) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className={styles.sortIcon}>
      {sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </span>
  )

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs />
      <h1 className={styles.title}>Admin Crypto Wallet Management</h1>
      <p className={styles.subtitle}>
        Manage platform wallet addresses for receiving escrow fees
      </p>

      {/* Generate New Wallet Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Generate New Wallet</h2>
        <p className={styles.description}>
          Create new wallet addresses for receiving crypto payments
        </p>
        
        <div className={styles.generateForm}>
          <div className={styles.cryptoSelector}>
            <label className={styles.selectorLabel}>Select Cryptocurrency</label>
            <div className={styles.cryptoGrid}>
              {cryptoTypes.map(crypto => (
                <button
                  key={crypto.value}
                  onClick={() => setSelectedCrypto(crypto.value)}
                  className={`${styles.cryptoOption} ${selectedCrypto === crypto.value ? styles.cryptoActive : ''}`}
                >
                  <span className={styles.cryptoName}>{crypto.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.generateActions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={setAsPrimary}
                onChange={(e) => setSetAsPrimary(e.target.checked)}
              />
              Set as default wallet for {selectedCrypto}
            </label>
            <div className={styles.feeRow}>
              <label className={styles.feeLabel}>Escrow Fee %:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={escrowFee}
                onChange={(e) => setEscrowFee(Number(e.target.value))}
                className={styles.feeInputSmall}
              />
              <button 
                onClick={saveFee}
                disabled={saving}
                className={styles.saveFeeBtnSmall}
              >
                Save
              </button>
            </div>
            <button 
              onClick={generateWallet}
              disabled={saving}
              className={styles.generateBtn}
            >
              {saving ? 'Generating...' : `Generate ${selectedCrypto} Wallet`}
            </button>
          </div>
        </div>
      </div>

      {/* Site Generated Wallets */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Site Generated Wallets</h2>
        
        {wallets.length === 0 && (
          <div className={styles.emptyState}>
            <p>No wallets generated yet. Use the form above to create wallet addresses.</p>
          </div>
        )}

        {wallets.length > 0 && (
          <div className={styles.walletList}>
            <div className={styles.listHeader}>
              {selectedWallets.size > 0 && (
                <div className={styles.bulkActions}>
                  <span className={styles.selectedCount}>
                    {selectedWallets.size} selected
                  </span>
                  <button
                    onClick={deleteSelectedWallets}
                    disabled={saving}
                    className={styles.deleteSelectedBtn}
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>

            <div className={styles.tableContainer}>
            <table className={styles.walletTable}>
            <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              </th>
              <th onClick={() => handleSort('cryptoType')} className={styles.sortableHeader}>Crypto</th>
              <th onClick={() => handleSort('address')} className={styles.sortableHeader}>Address</th>
              <th onClick={() => handleSort('isPrimary')} className={styles.sortableHeader}>Type</th>
              <th onClick={() => handleSort('admin')} className={styles.sortableHeader}>Generated</th>
              <th onClick={() => handleSort('createdAt')} className={styles.sortableHeader}>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedWallets.map(wallet => (
              <tr key={wallet.id} className={selectedWallets.has(wallet.id) ? styles.selectedRow : ''}>
                <td className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedWallets.has(wallet.id)}
                    onChange={() => toggleSelectForDelete(wallet.id)}
                  />
                </td>
                <td className={styles.cryptoCell}>
                  <img
                    src={getCryptoIcon(wallet.cryptoType)}
                    alt={wallet.cryptoType}
                    className={styles.cryptoIcon}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <span className={styles.cryptoLabel}>{wallet.cryptoType}</span>
                </td>
                <td className={styles.addressCell}>
                  <span className={styles.addressText}>
                    {formatAddress(wallet.address, showFullAddress === wallet.id)}
                  </span>
                  <button
                    onClick={() => setShowFullAddress(showFullAddress === wallet.id ? null : wallet.id)}
                          className={styles.copyBtnSmall}
                          title={showFullAddress === wallet.id ? "Hide" : "Show full"}
                        >
                          {showFullAddress === wallet.id ? '🙈' : '👁️'}
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(wallet.address)}
                          className={styles.copyBtnSmall}
                          title="Copy address"
                        >
                          📋
                        </button>
                      </td>
                      <td>
                        {wallet.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                        {wallet.userId && <span className={styles.userBadge}>User</span>}
                      </td>
                      <td className={styles.adminCell}>
                        {wallet.adminName || '-'}
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(wallet.createdAt).toLocaleDateString()}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          onClick={() => navigator.clipboard.writeText(wallet.address)}
                          className={styles.actionBtn}
                          title="Copy Address"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => requestViewKey(wallet.id)}
                          className={styles.actionBtn}
                          title="View Private Key"
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => {
                            setKeyToView(wallet.id)
                            viewSeedPhrase()
                          }}
                          className={styles.actionBtn}
                          title="View Seed Phrase"
                        >
                          🌱
                        </button>
                        {!wallet.isPrimary && (
                          <button
                            onClick={() => setPrimaryWallet(wallet.id)}
                            disabled={saving}
                            className={styles.actionBtn}
                            title="Set as Default"
                          >
                            ⭐
                          </button>
                        )}
                        {wallet.isPrimary && (
                          <span className={styles.primaryBadge} title="Default Wallet">✓</span>
                        )}
                        <button
                          onClick={() => window.location.href = `/admin/orders?wallet=${encodeURIComponent(wallet.address)}`}
                          className={styles.actionBtn}
                          title="View Transactions"
                        >
                          📜
                        </button>
                        <button
                          onClick={() => deleteWallet(wallet.id)}
                          disabled={saving}
                          className={styles.deleteBtn}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Wallets Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>User Wallets</h2>
        <p className={styles.description}>
          View wallets created by users on the platform
        </p>
        
        {userWallets.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No user wallets found.</p>
          </div>
        ) : (
          <div>
            <div className={styles.listHeader}>
              {selectedUserWallets.size > 0 && (
                <div className={styles.bulkActions}>
                  <span className={styles.selectedCount}>
                    {selectedUserWallets.size} selected
                  </span>
                  <button
                    onClick={() => deleteSelectedUserWallets()}
                    disabled={saving}
                    className={styles.deleteSelectedBtn}
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
            <div className={styles.tableContainer}>
            <table className={styles.walletTable}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={userWalletSelectAll}
                      onChange={() => {
                        if (userWalletSelectAll) {
                          setSelectedUserWallets(new Set())
                          setUserWalletSelectAll(false)
                        } else {
                          setSelectedUserWallets(new Set(userWallets.map(w => w.id)))
                          setUserWalletSelectAll(true)
                        }
                      }}
                    />
                  </th>
                  <th onClick={() => handleSort('cryptoType')} className={styles.sortableHeader}>
                    Crypto <SortIcon field="cryptoType" />
                  </th>
                  <th onClick={() => handleSort('address')} className={styles.sortableHeader}>
                    Address <SortIcon field="address" />
                  </th>
                  <th onClick={() => handleSort('user')} className={styles.sortableHeader}>
                    User <SortIcon field="user" />
                  </th>
                  <th onClick={() => handleSort('isPrimary')} className={styles.sortableHeader}>
                    Type <SortIcon field="isPrimary" />
                  </th>
                  <th onClick={() => handleSort('createdAt')} className={styles.sortableHeader}>
                    Created <SortIcon field="createdAt" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUserWallets.map(wallet => (
                  <tr key={wallet.id}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedUserWallets.has(wallet.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedUserWallets)
                          if (newSelected.has(wallet.id)) {
                            newSelected.delete(wallet.id)
                          } else {
                            newSelected.add(wallet.id)
                          }
                          setSelectedUserWallets(newSelected)
                          setUserWalletSelectAll(newSelected.size === userWallets.length)
                        }}
                      />
                    </td>
                    <td className={styles.cryptoCell}>
                      <img
                        src={getCryptoIcon(wallet.cryptoType)}
                        alt={wallet.cryptoType}
                        className={styles.cryptoIcon}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className={styles.cryptoLabel}>{wallet.cryptoType}</span>
                    </td>
                    <td className={styles.addressCell}>
                      <span className={styles.addressText}>
                        {formatAddress(wallet.address, showFullAddress === wallet.id)}
                      </span>
                      <button
                        onClick={() => setShowFullAddress(showFullAddress === wallet.id ? null : wallet.id)}
                        className={styles.copyBtnSmall}
                        title={showFullAddress === wallet.id ? "Hide" : "Show full"}
                      >
                        {showFullAddress === wallet.id ? '🙈' : '👁️'}
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(wallet.address)}
                        className={styles.copyBtnSmall}
                        title="Copy address"
                      >
                        📋
                      </button>
                    </td>
                    <td className={styles.userCell}>
                      {wallet.user.name || wallet.user.email}
                    </td>
                    <td className={styles.typeCell}>
                      {wallet.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(wallet.createdAt).toLocaleDateString()}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        onClick={() => navigator.clipboard.writeText(wallet.address)}
                        className={styles.actionBtn}
                        title="Copy Address"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => {
                          setKeyToView(wallet.id)
                          setShowKeyWarning(true)
                        }}
                        className={styles.actionBtn}
                        title="View Private Key"
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => {
                          setKeyToView(wallet.id)
                          setShowKeyWarning(true)
                        }}
                        className={styles.actionBtn}
                        title="View Seed Phrase"
                      >
                        🌱
                      </button>
                      <button
                        onClick={() => window.location.href = `/admin/orders?wallet=${encodeURIComponent(wallet.address)}`}
                        className={styles.actionBtn}
                        title="View Transactions"
                      >
                        📜
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* View Key Warning Modal */}
      {showKeyWarning && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>⚠️ Warning</h3>
            <div className={styles.warningBox}>
              <p>You are about to view sensitive wallet data.</p>
              <p><strong>Never share this information with anyone!</strong></p>
              <p>Anyone with this data can access and transfer all funds in this wallet.</p>
              <p>Make sure you are in a secure environment and no one can see your screen.</p>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={viewPrivateKey}
                disabled={saving}
                className={styles.confirmBtn}
              >
                View Private Key
              </button>
              <button 
                onClick={viewSeedPhrase}
                disabled={saving}
                className={styles.confirmBtn}
              >
                View Seed Phrase
              </button>
              <button 
                onClick={() => { setShowKeyWarning(false); setKeyToView(null) }}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Key Display */}
      {viewedData && viewedData.type === 'key' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>🔑 Private Key Revealed</h3>
            <div className={styles.warningBox}>
              <strong>NEVER share this key!</strong> Anyone with this key can access your funds.
            </div>
            <div className={styles.keyDisplay}>
              <code>{viewedData.data}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(viewedData.data)}
                className={styles.copyBtn}
              >
                Copy
              </button>
            </div>
            <button 
              onClick={() => setViewedData(null)}
              className={styles.closeBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Seed Phrase Display */}
      {viewedData && viewedData.type === 'seed' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>🌱 Seed Phrase Revealed</h3>
            <div className={styles.warningBox}>
              <strong>NEVER share this phrase!</strong> Anyone with this can restore your wallet and access all funds.
            </div>
            <div className={styles.seedPhraseGrid}>
              {viewedData.data.split(' ').map((word, index) => (
                <div key={index} className={styles.seedWord}>
                  <span className={styles.wordNumber}>{index + 1}</span>
                  <span className={styles.wordText}>{word}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(viewedData.data)}
              className={styles.copyBtn}
            >
              Copy All Words
            </button>
            <button 
              onClick={() => setViewedData(null)}
              className={styles.closeBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}