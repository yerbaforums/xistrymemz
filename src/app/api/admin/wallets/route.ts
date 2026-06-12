import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWallet, encryptPrivateKey, decryptPrivateKey } from '@/lib/wallet'

const CRYPTO_TYPES = ['ETH', 'BTC', 'USDT', 'USDC', 'XMR', 'XTM', 'ARRR', 'DERO', 'ZANO']

const CRYPTO_NAMES: Record<string, string> = {
  ETH: 'Ethereum',
  BTC: 'Bitcoin',
  USDT: 'Tether',
  USDC: 'USD Coin',
  XMR: 'Monero',
  XTM: 'Tari',
  ARRR: 'Pirate Chain',
  DERO: 'Dero',
  ZANO: 'Zano'
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const userWalletsOnly = searchParams.get('userWallets') === 'true'

    if (userWalletsOnly) {
      const userWallets = await prisma.userWallet.findMany({
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      return apiSuccess({ wallets: userWallets })
    }

    const settings = await prisma.platformSettings.findFirst()
    
    const wallets = await prisma.adminWallet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    })

    const walletsWithNames = wallets.map((w) => ({
      ...w,
      cryptoName: CRYPTO_NAMES[w.cryptoType] || w.cryptoType,
      adminName: w.user?.name || w.user?.email || null
    }))

    return NextResponse.json({ 
      wallets: walletsWithNames,
      cryptoTypes: CRYPTO_TYPES.map(c => ({ value: c, label: CRYPTO_NAMES[c] })),
      platformFeePercent: settings?.platformFeePercent || 10,
      platformWallet: settings?.platformWallet,
      remoteNodeUrl: settings?.remoteNodeUrl,
      remoteNodeApiKey: settings?.remoteNodeApiKey ? '***configured***' : null
    })
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return apiError("Failed to fetch wallets", 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { action, cryptoType, walletId, label, platformFeePercent, platformWallet, remoteNodeUrl, remoteNodeApiKey } = body

    let settings = await prisma.platformSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {}
      })
    }

    // Generate new wallet
    if (action === 'generate') {
      const currency = cryptoType || 'ETH'
      const wallet = generateWallet(currency)
      
      const existingPrimary = await prisma.adminWallet.findFirst({
        where: { cryptoType: currency, isPrimary: true }
      })
      
      const encryptedPrivateKey = wallet.privateKey ? encryptPrivateKey(wallet.privateKey) : null
      
      const newWallet = await prisma.adminWallet.create({
        data: {
          cryptoType: currency,
          address: wallet.address,
          privateKey: encryptedPrivateKey,
          publicKey: wallet.publicKey,
          isPrimary: !existingPrimary,
          label: label || null,
          userId: session.user.id
        }
      })

      const walletWithUser = await prisma.adminWallet.findUnique({
        where: { id: newWallet.id },
        include: { user: { select: { name: true, email: true } } }
      })

      return NextResponse.json({ 
        success: true, 
        wallet: {
          ...newWallet,
          cryptoName: CRYPTO_NAMES[currency] || currency,
          adminName: walletWithUser?.user?.name || walletWithUser?.user?.email || 'Admin'
        }
      })
    }

    // Delete wallet
    if (action === 'delete' && walletId) {
      const wallet = await prisma.adminWallet.findUnique({
        where: { id: walletId }
      })
      
      if (!wallet) {
        return apiError("Wallet not found", 404)
      }

      await prisma.adminWallet.delete({
        where: { id: walletId }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Wallet deleted successfully'
      })
    }

    // Set primary wallet (one per crypto type)
    if (action === 'setPrimary' && walletId && cryptoType) {
      await prisma.adminWallet.updateMany({
        where: { cryptoType, isPrimary: true },
        data: { isPrimary: false }
      })
      
      const wallet = await prisma.adminWallet.update({
        where: { id: walletId },
        data: { isPrimary: true }
      })
      
      return NextResponse.json({ 
        success: true, 
        wallet: {
          ...wallet,
          cryptoName: CRYPTO_NAMES[wallet.cryptoType] || wallet.cryptoType
        }
      })
    }

    // Delete user wallet
    if (action === 'deleteUserWallet' && walletId) {
      const wallet = await prisma.userWallet.findUnique({
        where: { id: walletId }
      })
      
      if (!wallet) {
        return apiError("Wallet not found", 404)
      }

      await prisma.userWallet.delete({
        where: { id: walletId }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'User wallet deleted successfully'
      })
    }

    // View private key (seed phrase)
    if (action === 'viewPrivateKey' && walletId) {
      const wallet = await prisma.adminWallet.findUnique({
        where: { id: walletId }
      })
      
      if (!wallet) {
        return apiError("Wallet not found", 404)
      }

      if (!wallet.privateKey) {
        return apiError("No private key stored", 400)
      }

      try {
        const privateKey = decryptPrivateKey(wallet.privateKey)
        return NextResponse.json({
          success: true,
          privateKey,
          warning: 'WARNING: Never share your private key. Anyone with this key can access your funds.'
        })
      } catch (error) {
        console.error('Error decrypting private key:', error)
        return apiError("Failed to decrypt private key", 500)
      }
    }

    // View seed phrase
    if (action === 'viewSeedPhrase' && walletId) {
      const wallet = await prisma.adminWallet.findUnique({
        where: { id: walletId }
      })
      
      if (!wallet) {
        return apiError("Wallet not found", 404)
      }

      if (!wallet.seedPhrase) {
        return apiError("No seed phrase stored for this wallet", 400)
      }

      try {
        const seedPhrase = decryptPrivateKey(wallet.seedPhrase)
        return NextResponse.json({
          success: true,
          seedPhrase,
          warning: 'WARNING: Never share your seed phrase. Anyone with this phrase can restore your wallet and access all funds.'
        })
      } catch (error) {
        console.error('Error decrypting seed phrase:', error)
        return apiError("Failed to decrypt seed phrase", 500)
      }
    }

    // Update platform settings
    if (platformFeePercent !== undefined || platformWallet !== undefined || remoteNodeUrl !== undefined || remoteNodeApiKey !== undefined) {
      const updateData: Record<string, unknown> = {}
      if (platformFeePercent !== undefined) updateData.platformFeePercent = platformFeePercent
      if (platformWallet !== undefined) updateData.platformWallet = platformWallet
      if (remoteNodeUrl !== undefined) updateData.remoteNodeUrl = remoteNodeUrl
      if (remoteNodeApiKey !== undefined) updateData.remoteNodeApiKey = remoteNodeApiKey

      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: updateData
      })

      return NextResponse.json({ 
        success: true, 
        platformFeePercent: settings.platformFeePercent,
        platformWallet: settings.platformWallet,
        remoteNodeUrl: settings.remoteNodeUrl
      })
    }

    return apiError("Invalid action", 400)
  } catch (error) {
    console.error('Error updating wallet:', error)
    return apiSuccess({ error: 'Failed to update wallet: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}