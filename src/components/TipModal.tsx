'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'

interface CryptoOption {
  symbol: string
  name: string
  available: number
  icon: string
  color: string
}

interface TipModalProps {
  isOpen: boolean
  onClose: () => void
  onTip: (amount: number, cryptoSymbol: string) => Promise<void>
  endpoint?: string
}

export default function TipModal({ isOpen, onClose, onTip }: TipModalProps) {
  const [tipAmount, setTipAmount] = useState('')
  const [tipCrypto, setTipCrypto] = useState('USDT')
  const [cryptoBalances, setCryptoBalances] = useState<CryptoOption[]>([])
  const [tipping, setTipping] = useState(false)
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12,
        padding: 24, width: '90%', maxWidth: 400,
        border: '1px solid var(--border-color)'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>Send Tip</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {cryptoBalances.map(c => (
            <button key={c.symbol} type="button" onClick={() => setTipCrypto(c.symbol)}
              style={{
                padding: '8px', borderRadius: 8, border: tipCrypto === c.symbol ? `2px solid ${c.color}` : '1px solid var(--border-color)',
                background: tipCrypto === c.symbol ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', textAlign: 'center'
              }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{c.symbol}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{c.available.toFixed(2)}</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            Amount ({tipCrypto}) — Available: {selectedCrypto?.available.toFixed(2) || '0'}
          </label>
          <input type="number" min="0" step="0.01" value={tipAmount}
            onChange={e => setTipAmount(e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }}
            placeholder="0.00" />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={tipping || !tipAmount}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: tipping || !tipAmount ? 'not-allowed' : 'pointer', opacity: tipping || !tipAmount ? 0.6 : 1 }}>
            {tipping ? 'Tipping...' : 'Confirm Tip'}
          </button>
        </div>
      </div>
    </div>
  )
}
