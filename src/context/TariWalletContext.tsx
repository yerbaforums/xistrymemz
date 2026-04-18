'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  WalletConnection,
  WalletType,
  connectWalletDaemon,
  connectMetaMask,
  connectTariUniverse,
  disconnect,
  getConnection,
  getBalance,
  claimTestnetFunds
} from '@/lib/tari-wallet'

interface TariWalletContextType {
  connection: WalletConnection | null
  isConnecting: boolean
  error: string | null
  balance: { available: string; pending: string } | null
  connect: (type: WalletType) => Promise<void>
  disconnect: () => Promise<void>
  refreshBalance: () => Promise<void>
  claimFunds: () => Promise<{ success: boolean; error?: string }>
  isSupported: boolean
}

const TariWalletContext = createContext<TariWalletContextType | undefined>(undefined)

export function useTariWallet() {
  const context = useContext(TariWalletContext)
  if (!context) {
    throw new Error('useTariWallet must be used within a TariWalletProvider')
  }
  return context
}

interface TariWalletProviderProps {
  children: React.ReactNode
}

export function TariWalletProvider({ children }: TariWalletProviderProps) {
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<{ available: string; pending: string } | null>(null)

  const refreshBalance = useCallback(async () => {
    const bal = await getBalance()
    setBalance(bal)
  }, [])

  const checkExistingConnection = useCallback(() => {
    const conn = getConnection()
    if (conn?.isConnected) {
      setConnection(conn)
      refreshBalance()
    }
  }, [refreshBalance])

  useEffect(() => {
    checkExistingConnection()
  }, [checkExistingConnection])

  const connect = useCallback(async (type: WalletType) => {
    setIsConnecting(true)
    setError(null)

    try {
      let conn: WalletConnection

      switch (type) {
        case 'wallet-daemon':
          conn = await connectWalletDaemon()
          break
        case 'meta-mask':
          conn = await connectMetaMask()
          break
        case 'tari-universe':
          conn = await connectTariUniverse()
          break
        default:
          throw new Error('Unknown wallet type')
      }

      setConnection(conn)
      
      const bal = await getBalance()
      setBalance(bal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    await disconnect()
    setConnection(null)
    setBalance(null)
    setError(null)
  }, [])

  const handleClaimFunds = useCallback(async () => {
    const result = await claimTestnetFunds()
    if (result.success) {
      await refreshBalance()
    }
    return result
  }, [refreshBalance])

  const value: TariWalletContextType = {
    connection,
    isConnecting,
    error,
    balance,
    connect,
    disconnect: handleDisconnect,
    refreshBalance,
    claimFunds: handleClaimFunds,
    isSupported: true
  }

  return (
    <TariWalletContext.Provider value={value}>
      {children}
    </TariWalletContext.Provider>
  )
}
