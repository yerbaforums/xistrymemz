/* eslint-disable @typescript-eslint/no-explicit-any */

export type WalletType = 'wallet-daemon' | 'meta-mask' | 'tari-universe'

export interface WalletConnection {
  type: WalletType
  address: string
  isConnected: boolean
}

export interface BalanceInfo {
  available: string
  pending: string
}

const TARI_WALLET_URL = process.env.TARI_WALLET_URL || 'http://localhost:18143'

let currentConnection: WalletConnection | null = null

let walletClient: any = null

async function getWalletClient(): Promise<any> {
  if (!walletClient) {
    try {
      const { WalletDaemonClient } = await import('@tari-project/wallet_jrpc_client')
      walletClient = await WalletDaemonClient.usingFetchTransport(TARI_WALLET_URL)
    } catch (error) {
      console.error('Failed to load wallet client:', error)
      throw new Error('Tari wallet daemon client not available')
    }
  }
  return walletClient
}

export async function connectWalletDaemon(
  serverUrl: string = 'http://localhost:18143'
): Promise<WalletConnection> {
  try {
    const client = await getWalletClient()
    const accountsResponse = await client.accountsList({})
    const accounts = accountsResponse.accounts || []
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Create an account in Tari Wallet first.')
    }
    
    const defaultAccount = accounts[0]
    
    currentConnection = {
      type: 'wallet-daemon',
      address: defaultAccount.address,
      isConnected: true
    }
    
    return currentConnection
  } catch (error) {
    console.error('Failed to connect to Wallet Daemon:', error)
    throw new Error('Could not connect to Tari Wallet Daemon. Make sure it is running on ' + serverUrl)
  }
}

export async function connectMetaMask(): Promise<WalletConnection> {
  throw new Error('MetaMask integration requires @tari-project/metamask-signer package')
}

export async function connectTariUniverse(): Promise<WalletConnection> {
  throw new Error('Tari Universe integration requires @tari-project/tari-universe-signer package')
}

export async function disconnect(): Promise<void> {
  currentConnection = null
}

export function getConnection(): WalletConnection | null {
  return currentConnection
}

export function isConnected(): boolean {
  return currentConnection?.isConnected ?? false
}

export async function getBalance(): Promise<BalanceInfo | null> {
  if (!currentConnection) return null
  
  try {
    const client = await getWalletClient()
    const response = await client.accountsList({})
    const accounts = response.accounts || []
    const account = accounts.find((a: any) => a.address === currentConnection?.address)
    
    if (!account) return null
    
    return {
      available: account.balance?.available || '0',
      pending: account.balance?.pending || '0'
    }
  } catch (error) {
    console.error('Failed to get balance:', error)
    return null
  }
}

export async function transfer(
  toAddress: string,
  amount: number
): Promise<{ success: boolean; txId?: string; error?: string }> {
  if (!currentConnection) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const client = await getWalletClient()
    const result = await client.accountsTransfer({
      account_address: currentConnection.address,
      destinations: [{
        address: toAddress,
        amount: BigInt(amount),
        icon: null,
        symbol: null
      }]
    })
    
    return { success: true, txId: result.transaction_id }
  } catch (error: any) {
    console.error('Transfer failed:', error)
    return { success: false, error: error.message }
  }
}

export async function claimTestnetFunds(): Promise<{ success: boolean; error?: string }> {
  if (!currentConnection || currentConnection.type !== 'wallet-daemon') {
    return { success: false, error: 'Only Wallet Daemon supports faucet' }
  }

  try {
    const client = await getWalletClient()
    await client.createFreeTestCoins({
      account_address: currentConnection.address,
      amount: BigInt(1000000),
      dest_address: currentConnection.address
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
