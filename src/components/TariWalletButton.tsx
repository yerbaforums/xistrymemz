'use client'

import React, { useState } from 'react'
import { useTariWallet } from '@/context/TariWalletContext'
import styles from './TariWalletButton.module.css'

interface TariWalletButtonProps {
  variant?: 'button' | 'inline'
  className?: string
}

export function TariWalletButton({ className = '' }: TariWalletButtonProps) {
  const { 
    connection, 
    isConnecting, 
    error, 
    balance, 
    connect, 
    disconnect, 
    refreshBalance,
    claimFunds,
    isSupported 
  } = useTariWallet()
  
  const [showDropdown, setShowDropdown] = useState(false)
  const [claiming, setClaiming] = useState(false)

  if (!isSupported) {
    return null
  }

  if (connection?.isConnected) {
    return (
      <div className={`${styles.connected} ${className}`}>
        <button 
          className={styles.walletBtn}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className={styles.tariIcon}>₮</span>
          <span className={styles.address}>
            {connection.address.slice(0, 8)}...{connection.address.slice(-4)}
          </span>
          {balance && (
            <span className={styles.balance}>
              {parseInt(balance.available).toLocaleString()} tT
            </span>
          )}
        </button>
        
        {showDropdown && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.walletType}>
                {connection.type === 'wallet-daemon' && '🖥️ Wallet Daemon'}
                {connection.type === 'meta-mask' && '🦊 MetaMask'}
                {connection.type === 'tari-universe' && '🌍 Tari Universe'}
              </span>
            </div>
            
            <div className={styles.dropdownInfo}>
              <div className={styles.infoRow}>
                <span>Address:</span>
                <code>{connection.address}</code>
              </div>
              {balance && (
                <div className={styles.infoRow}>
                  <span>Balance:</span>
                  <strong>{parseInt(balance.available).toLocaleString()} tT</strong>
                </div>
              )}
            </div>

            <div className={styles.dropdownActions}>
              <button 
                className={styles.actionBtn}
                onClick={() => { refreshBalance(); setShowDropdown(false); }}
              >
                🔄 Refresh
              </button>
              
              {connection.type === 'wallet-daemon' && (
                <button 
                  className={styles.actionBtn}
                  onClick={async () => {
                    setClaiming(true)
                    await claimFunds()
                    setClaiming(false)
                    setShowDropdown(false)
                  }}
                  disabled={claiming}
                >
                  {claiming ? '⏳...' : '💰 Get Test Funds'}
                </button>
              )}
              
              <button 
                className={`${styles.actionBtn} ${styles.disconnectBtn}`}
                onClick={() => { disconnect(); setShowDropdown(false); }}
              >
                🚪 Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <button 
        className={styles.connectBtn}
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isConnecting}
      >
        <span className={styles.tariIcon}>₮</span>
        {isConnecting ? 'Connecting...' : 'Connect Tari'}
      </button>

      {showDropdown && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Choose Wallet</span>
          </div>
          
          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}
          
          <div className={styles.walletOptions}>
            <button 
              className={styles.walletOption}
              onClick={() => { connect('wallet-daemon'); setShowDropdown(false); }}
              disabled={isConnecting}
            >
              <span className={styles.optionIcon}>🖥️</span>
              <div className={styles.optionInfo}>
                <strong>Wallet Daemon</strong>
                <small>Local wallet running on your machine</small>
              </div>
            </button>
            
            <div className={styles.walletOption} style={{ opacity: 0.5 }}>
              <span className={styles.optionIcon}>🌍</span>
              <div className={styles.optionInfo}>
                <strong>Tari Universe</strong>
                <small>Coming soon</small>
              </div>
            </div>
            
            <div className={styles.walletOption} style={{ opacity: 0.5 }}>
              <span className={styles.optionIcon}>🦊</span>
              <div className={styles.optionInfo}>
                <strong>MetaMask</strong>
                <small>Coming soon</small>
              </div>
            </div>
          </div>
          
          <div className={styles.dropdownFooter}>
            <small>Testnet only (esmeralda)</small>
          </div>
        </div>
      )}
    </div>
  )
}
