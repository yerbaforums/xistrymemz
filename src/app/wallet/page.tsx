'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { getCryptoIcon, getCryptoName, CRYPTO_ICONS } from '@/lib/crypto-icons'
import { useTariWallet } from '@/context/TariWalletContext'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'

interface UserWallet {
  id: string
  cryptoType: string
  address: string
  isPrimary: boolean
  createdAt: string
}

export default function WalletPage() {
  const { connection, balance: tariBalance, connect, disconnect, isConnecting } = useTariWallet()
  const { success, error } = useToast()
  const [balance, setBalance] = useState(0)
  const [wallets, setWallets] = useState<UserWallet[]>([])
  const [paymentAddress, setPaymentAddress] = useState('')
  const [selectedCrypto, setSelectedCrypto] = useState('')
  const [cryptoOptions] = useState<{value: string, label: string, network: string, icon?: string, color?: string}[]>([
    { value: 'ETH', label: 'Ethereum (ETH)', network: 'Ethereum', icon: '/crypto-logos/ethereum.png', color: '#627EEA' },
    { value: 'BTC', label: 'Bitcoin (BTC)', network: 'Bitcoin', icon: '/crypto-logos/bitcoin.png', color: '#F7931A' },
    { value: 'USDT', label: 'Tether (USDT)', network: 'Ethereum', icon: '/crypto-logos/tether.png', color: '#26A17B' },
    { value: 'USDC', label: 'USD Coin (USDC)', network: 'Ethereum', icon: '/crypto-logos/usd-coin.png', color: '#2775CA' },
    { value: 'XMR', label: 'Monero (XMR)', network: 'Monero', icon: '/crypto-logos/monero.png', color: '#FF6600' },
    { value: 'XTM', label: 'Tari (XTM)', network: 'Tari', icon: '/crypto-logos/tari.png', color: '#8B5CF6' },
    { value: 'ARRR', label: 'Pirate Chain (ARRR)', network: 'Pirate Chain', icon: '/crypto-logos/pirate-chain.png', color: '#000000' },
    { value: 'DERO', label: 'Dero (DERO)', network: 'Dero', icon: '/crypto-logos/dero.png', color: '#2F3854' },
    { value: 'ZANO', label: 'Zano (ZANO)', network: 'Zano', icon: '/crypto-logos/zano.png', color: '#4A90D9' },
  ])

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchWallet()
  }, [])

  async function fetchWallet() {
    try {
      const res = await fetch('/api/wallet')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/auth/login'
          return
        }
        throw new Error('Failed to fetch wallet')
      }
      const data = await res.json()
      if (data.balance !== undefined) setBalance(data.balance)
      if (data.wallets) {
        setWallets(data.wallets)
      }
      if (data.paymentAddress) setPaymentAddress(data.paymentAddress)
      if (data.wallets?.length > 0 && !selectedCrypto) {
        setSelectedCrypto(data.wallets[0].cryptoType)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function generateAddress(currency: string) {
    setGenerating(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateAddress', cryptoCurrency: currency })
      })
      const data = await res.json()
      if (data.success) {
        if (data.isNew) {
          success(`New address generated for ${data.cryptoCurrency}!`)
        }
        fetchWallet()
        setSelectedCrypto(data.cryptoCurrency)
      } else if (data.error) {
        error(data.error)
      }
    } catch (err) {
      console.error(err)
      error('Failed to generate address: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGenerating(false)
    }
  }

  async function generateNewAddress(currency: string) {
    if (!confirm('Generate a new address? Your old address will remain associated with your account.')) {
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateNewAddress', cryptoCurrency: currency })
      })
      const data = await res.json()
      if (data.success) {
        success(`New address generated for ${data.cryptoCurrency}!`)
        fetchWallet()
      } else if (data.error) {
        error(data.error)
      }
    } catch (err) {
      console.error(err)
      error('Failed to generate new address')
    } finally {
      setGenerating(false)
    }
  }

  function copyAddress(address: string) {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getWalletsForCrypto = (crypto: string) => {
    return wallets.filter(w => w.cryptoType === crypto)
  }

  const primaryWallet = (crypto: string) => {
    return wallets.find(w => w.cryptoType === crypto && w.isPrimary)
  }

  if (loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Wallet</h1>
          <p className={styles.subtitle}>Manage your account balance and crypto addresses</p>
        </div>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
      </div>

      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>Available Balance</div>
        <div className={styles.balanceAmount}>
          <span className={styles.currencySymbol}>$</span>
          {balance.toFixed(2)}
        </div>
        <div className={styles.balanceHint}>
          Use this balance for marketplace purchases, escrow payments, and more
        </div>
      </div>

      <div className={`${styles.balanceCard} ${styles.tariCard}`}>
        <div className={styles.tariHeader}>
          <span className={styles.tariIcon}>₮</span>
          <h3>Tari Ootle Wallet</h3>
        </div>
        
        {connection?.isConnected ? (
          <div className={styles.tariConnected}>
            <div className={styles.tariInfo}>
              <div className={styles.tariBalance}>
                <span className={styles.tariBalanceLabel}>Balance:</span>
                <span className={styles.tariBalanceAmount}>
                  {tariBalance ? parseInt(tariBalance.available).toLocaleString() : 0} tT
                </span>
              </div>
              <div className={styles.tariAddress}>
                <span className={styles.tariAddressLabel}>Address:</span>
                <code>{connection.address}</code>
              </div>
              <div className={styles.tariType}>
                Connected via: {connection.type === 'wallet-daemon' && '🖥️ Wallet Daemon'}
                {connection.type === 'meta-mask' && '🦊 MetaMask'}
                {connection.type === 'tari-universe' && '🌍 Tari Universe'}
              </div>
            </div>
            <button onClick={disconnect} className={styles.tariDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className={styles.tariConnect}>
            <p>Connect your Tari wallet to use Ootle features on testnet</p>
            <div className={styles.tariButtons}>
              <button 
                onClick={() => connect('wallet-daemon')}
                disabled={isConnecting}
                className={styles.tariBtn}
              >
                🖥️ Wallet Daemon
              </button>
              <button 
                onClick={() => connect('tari-universe')}
                disabled={isConnecting}
                className={styles.tariBtn}
              >
                🌍 Tari Universe
              </button>
              <button 
                onClick={() => connect('meta-mask')}
                disabled={isConnecting}
                className={styles.tariBtn}
              >
                🦊 MetaMask
              </button>
            </div>
            <p className={styles.tariHint}>
              Requires esmeralda testnet wallet
            </p>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Fund Your Account</h2>
        <p className={styles.description}>
          Generate a crypto deposit address to add funds to your wallet. Each cryptocurrency gets a unique address.
        </p>

        <div className={styles.cryptoSelector}>
          <label className={styles.selectorLabel}>Select Cryptocurrency</label>
          <div className={styles.cryptoGrid}>
            {cryptoOptions.map(crypto => {
              const wallet = primaryWallet(crypto.value)
              const hasWallet = !!wallet
              return (
                <button
                  key={crypto.value}
                  onClick={() => {
                    setSelectedCrypto(crypto.value)
                    if (!hasWallet) {
                      generateAddress(crypto.value)
                    }
                  }}
                  className={`${styles.cryptoOption} ${selectedCrypto === crypto.value ? styles.cryptoActive : ''}`}
                  disabled={generating}
                >
                  <div className={styles.cryptoLogoWrapper} style={{ position: 'relative', width: 40, height: 40, marginBottom: 8 }}>
                    <img 
                      src={crypto.icon || getCryptoIcon(crypto.value)} 
                      alt={crypto.value}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', background: '#fff' }}
                    />
                  </div>
                  <span className={styles.cryptoName}>{crypto.label}</span>
                  <span className={styles.cryptoNetwork}>
                    {hasWallet ? '✓ Address Generated' : 'Click to Generate'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {selectedCrypto && (
          <div className={styles.addressSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className={styles.addressLabel}>
                Your {getCryptoName(selectedCrypto)} ({selectedCrypto}) Addresses
              </label>
              <button 
                onClick={() => generateNewAddress(selectedCrypto)}
                className={styles.newAddressBtn}
                disabled={generating}
              >
                + Generate New Address
              </button>
            </div>
            
            {getWalletsForCrypto(selectedCrypto).length > 0 ? (
              <div className={styles.walletList}>
                {getWalletsForCrypto(selectedCrypto).map((wallet) => (
                  <div key={wallet.id} className={styles.walletItem}>
                    <div className={styles.walletAddressBox}>
                      <code className={styles.address}>{wallet.address}</code>
                      <button onClick={() => copyAddress(wallet.address)} className={styles.copyBtn}>
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    {wallet.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                    <span className={styles.walletDate}>
                      Created: {new Date(wallet.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noAddress}>
                <p>No address generated yet for {selectedCrypto}</p>
                <button 
                  onClick={() => generateAddress(selectedCrypto)}
                  className={styles.generateBtn}
                  disabled={generating}
                >
                  {generating ? 'Generating...' : 'Generate Address'}
                </button>
              </div>
            )}
            
            <div className={styles.addressHint}>
              Send only {selectedCrypto} to these addresses. Other cryptocurrencies sent here may be lost.
            </div>
          </div>
        )}

        <div className={styles.warningBox}>
          <strong>Important:</strong> Crypto deposits require network confirmations. 
          Your balance will update automatically once transactions are confirmed on the blockchain.
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Withdraw Funds</h2>
        <p className={styles.description}>
          Set up a payout address to withdraw your balance.
        </p>
        
        <div className={styles.withdrawForm}>
          <label className={styles.inputLabel}>Payout Address</label>
          <div className={styles.inputRow}>
            <input
              type="text"
              value={paymentAddress}
              onChange={e => setPaymentAddress(e.target.value)}
              placeholder="Enter your crypto address for withdrawals"
              className={styles.input}
            />
            <button className={styles.saveBtn}>Save Address</button>
          </div>
          <div className={styles.inputHint}>
            Withdrawals are processed manually. Contact support for large amounts.
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepTitle}>Select Crypto</div>
            <div className={styles.stepDesc}>Choose which cryptocurrency you want to deposit</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepTitle}>Send Crypto</div>
            <div className={styles.stepDesc}>Transfer funds from your wallet to the deposit address</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepTitle}>Receive Balance</div>
            <div className={styles.stepDesc}>Once confirmed, your account balance will be updated</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepTitle}>Use Funds</div>
            <div className={styles.stepDesc}>Use your balance for marketplace purchases and escrow</div>
          </div>
        </div>
      </div>
    </div>
  )
}
