'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'
import { DonationActions } from '@/components/DonationActions'
import { QRCodeModal } from '@/components/QRCodeModal'
import { CRYPTO_LOGOS } from '@/lib/constants'
import styles from './TipModal.module.css'

interface CryptoOption {
  symbol: string
  name: string
  available: number
  icon: string
  color: string
}

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
}

interface TipModalProps {
  isOpen: boolean
  onClose: () => void
  onTip: (amount: number, cryptoSymbol: string) => Promise<void>
  donationAddresses?: DonationAddr[]
  endpoint?: string
  walletEnabled?: boolean
}

export default function TipModal({ isOpen, onClose, onTip, donationAddresses, walletEnabled = true }: TipModalProps) {
  const [tipAmount, setTipAmount] = useState('')
  const [tipCrypto, setTipCrypto] = useState('USDT')
  const [cryptoBalances, setCryptoBalances] = useState<CryptoOption[]>([])
  const [tipping, setTipping] = useState(false)
  const [qrAddr, setQrAddr] = useState<DonationAddr | null>(null)
  const { error: toastError } = useToast()

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/posts/tip-options')
      .then(r => r.json())
      .then(data => setCryptoBalances(data.cryptoBalances || []))
      .catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  const selectedCrypto = cryptoBalances.find(c => c.symbol === tipCrypto)

  const handleConfirm = async () => {
    const amount = parseFloat(tipAmount)
    if (!amount || amount <= 0) {
      toastError('Enter a valid tip amount')
      return
    }
    if (selectedCrypto && amount > selectedCrypto.available) {
      toastError('Insufficient balance')
      return
    }
    setTipping(true)
    try {
      await onTip(amount, tipCrypto)
      setTipAmount('')
      onClose()
    } catch {
      toastError('Tip failed')
    } finally {
      setTipping(false)
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <h3 className={styles.title}>Send Tip</h3>

          {cryptoBalances.length > 0 && (
            <>
              {!walletEnabled && (
                <div className={styles.warningBanner}>
                  Wallet features are disabled. You can still send direct donations below.
                </div>
              )}
              <div className={`${styles.cryptoGrid} ${!walletEnabled ? styles.cryptoGridDisabled : ''}`}>
                {cryptoBalances.map(c => (
                  <button key={c.symbol} type="button" onClick={() => setTipCrypto(c.symbol)}
                    className={tipCrypto === c.symbol ? styles.cryptoBtnActive : styles.cryptoBtn}
                    style={{
                      border: tipCrypto === c.symbol ? `2px solid ${c.color}` : '1px solid var(--border-color)',
                      background: tipCrypto === c.symbol ? 'var(--bg-hover)' : 'transparent'
                    }}>
                    <div className={styles.cryptoSymbol}>{c.symbol}</div>
                    <div className={styles.cryptoBalance}>{c.available.toFixed(2)}</div>
                  </button>
                ))}
              </div>

              <div className={`${styles.inputGroup} ${!walletEnabled ? styles.inputGroupDisabled : ''}`}>
                <label className={styles.inputLabel}>
                  Amount ({tipCrypto}) — Available: {selectedCrypto?.available.toFixed(2) || '0'}
                </label>
                <input type="number" min="0" step="0.01" value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  className={styles.input}
                  placeholder="0.00" />
              </div>

              <div className={styles.actions}>
                <button type="button" onClick={onClose} className={styles.btnCancel}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirm} disabled={tipping || !tipAmount || !walletEnabled}
                  className={styles.btnConfirm}>
                  {tipping ? 'Tipping...' : !walletEnabled ? 'Wallet Unavailable' : 'Confirm Tip'}
                </button>
              </div>
            </>
          )}

          {donationAddresses && donationAddresses.length > 0 && (
            <div className={styles.donationSection}>
              <h4 className={styles.donationTitle}>
                💰 Direct Donations
              </h4>
              <div className={styles.donationList}>
                {donationAddresses.map(da => (
                  <div key={da.id} className={styles.donationItem}>
                    <img src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`}
                      alt={da.currency} width={18} height={18} className={styles.donationIcon} />
                    <span className={styles.donationLabel}>
                      {da.label || da.currency}
                    </span>
                    <code className={styles.donationAddress}>
                      {da.address}
                    </code>
                    <DonationActions address={da.address} size="sm" onQrClick={() => setQrAddr(da)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {qrAddr && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrAddr(null)}
          currency={qrAddr.label || qrAddr.currency}
          address={qrAddr.address}
        />
      )}
    </>
  )
}
