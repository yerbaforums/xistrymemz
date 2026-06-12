import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock function to simulate checking blockchain for deposits
// In production, this would connect to actual blockchain nodes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkBlockchainForDeposits(_cryptoType: string, _address: string): Promise<unknown[]> {
  // This is a placeholder - in production, you would:
  // - For ETH/USDT/USDC: use Web3.js to query RPC node
  // - For BTC: use bitcoind RPC or Electrum
  // - For XMR/XTM/ARRR/DERO/ZANO: use monero-daemon RPC
  
  // For now, return empty array - deposits are recorded when user submits tx hash
  return []
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
      return apiError("Unauthorized", 403)
    }

    const body = await request.json()
    const { action, walletAddress } = body

    if (action === 'check_deposits') {
      if (!walletAddress) {
        return apiError("Wallet address required", 400)
      }

      // Check blockchain for new deposits
      const deposits = await checkBlockchainForDeposits('ETH', walletAddress)

      // Find any new deposits not already in database
      const newDeposits: unknown[] = []
      
      for (const deposit of deposits) {
        const depositTyped = deposit as { txHash?: string }
        if (!depositTyped.txHash) continue
        
        const existing = await prisma.deposit.findUnique({
          where: { txHash: depositTyped.txHash }
        })

        if (!existing) {
          // Could auto-create pending deposit here
          newDeposits.push(deposit)
        }
      }

      return NextResponse.json({
        checked: true,
        newDeposits
      })
    }

    if (action === 'confirm_deposit') {
      const { depositId } = body
      
      const deposit = await prisma.deposit.update({
        where: { id: depositId },
        data: {
          status: 'CONFIRMED',
          confirmations: 1,
          confirmedAt: new Date()
        }
      })

      // Update user balance
      if (deposit.userId) {
        await prisma.user.update({
          where: { id: deposit.userId },
          data: {
            balance: {
              increment: deposit.amount
            }
          }
        })
      }

      return apiSuccess(deposit)
    }

    return apiError("Unknown action", 400)
  } catch (error) {
    console.error('Error in blockchain sync:', error)
    return apiError("Failed to sync", 500)
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
      return apiError("Unauthorized", 403)
    }

    const { searchParams } = new URL(request.url)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _action = searchParams.get('action')

    // Get platform settings for wallet addresses
    const settings = await prisma.platformSettings.findFirst()
    
    if (!settings) {
      return apiError("No platform settings", 404)
    }

    const walletFields = [
      'adminEthWallet', 'adminBtcWallet', 'adminUsdtWallet', 'adminUsdcWallet',
      'adminXmrWallet', 'adminXtmWallet', 'adminArrrWallet', 'adminDeroWallet', 'adminZanoWallet'
    ]

    const platformWallets: Record<string, string> = {}
    
    for (const field of walletFields) {
      const settingsRecord = settings as Record<string, unknown>
      const address = settingsRecord[field] as string | undefined
      if (address) {
        const crypto = field.replace('admin', '').replace('Wallet', '')
        platformWallets[crypto] = address
      }
    }

    return NextResponse.json({
      wallets: platformWallets,
      remoteNodeUrl: settings.remoteNodeUrl,
      remoteNodeConfigured: !!settings.remoteNodeUrl && !!settings.remoteNodeApiKey
    })
  } catch (error) {
    console.error('Error fetching crypto config:', error)
    return apiError("Failed to fetch config", 500)
  }
}