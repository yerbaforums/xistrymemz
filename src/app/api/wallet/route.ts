import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CRYPTO_ICONS } from '@/lib/crypto-icons'
import { generateWallet, encryptPrivateKey } from '@/lib/wallet'

const CRYPTO_OPTIONS = Object.values(CRYPTO_ICONS).map(crypto => ({
  value: crypto.symbol,
  label: `${crypto.name} (${crypto.symbol})`,
  network: crypto.name,
  icon: crypto.icon,
  color: crypto.color
}))

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        balance: true,
        walletAddress: true,
        paymentAddress: true,
        cryptoCurrency: true,
        wallets: {
          select: {
            id: true,
            cryptoType: true,
            address: true,
            isPrimary: true,
            createdAt: true
          }
        }
      }
    })

    if (!user) {
      return apiError("User not found", 404)
    }

    const cryptoOptions = CRYPTO_OPTIONS

    return NextResponse.json({
      balance: user.balance || 0,
      walletAddress: user.walletAddress,
      paymentAddress: user.paymentAddress,
      cryptoCurrency: user.cryptoCurrency || 'ETH',
      cryptoOptions,
      wallets: user.wallets || []
    })
  } catch (error) {
    console.error('Error fetching wallet:', error)
    return apiError("Failed to fetch wallet", 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { action, cryptoCurrency, paymentAddress } = body

    if (action === 'generateAddress') {
      const cryptoType = cryptoCurrency || 'ETH'
      
      const existingWallet = await prisma.userWallet.findFirst({
        where: {
          userId: session.user.id,
          cryptoType: cryptoType
        }
      })
      
      if (existingWallet) {
        return NextResponse.json({
          success: true,
          walletAddress: existingWallet.address,
          cryptoCurrency: cryptoType,
          isNew: false,
          message: 'Existing address retrieved'
        })
      }
      
      let wallet
      try {
        wallet = generateWallet(cryptoType)
      } catch (walletError) {
        console.error('Wallet generation error:', walletError)
        return apiSuccess({ error: 'Failed to generate wallet: ' + (walletError instanceof Error ? walletError.message : 'Unknown error') }, { status: 500 })
      }
      
      let encryptedPrivateKey = null
      if (wallet.privateKey) {
        try {
          encryptedPrivateKey = encryptPrivateKey(wallet.privateKey)
        } catch (encryptError) {
          console.error('Encryption error:', encryptError)
          return apiError("Failed to encrypt private key", 500)
        }
      }
      
      await prisma.userWallet.create({
        data: {
          userId: session.user.id,
          cryptoType: cryptoType,
          address: wallet.address,
          privateKey: encryptedPrivateKey,
          publicKey: wallet.publicKey,
          isPrimary: true
        }
      })
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          walletAddress: wallet.address,
          cryptoCurrency: cryptoType
        }
      })

      return NextResponse.json({
        success: true,
        walletAddress: wallet.address,
        cryptoCurrency: cryptoType,
        isNew: true,
        message: 'New address generated'
      })
    }

    if (action === 'generateNewAddress') {
      const cryptoType = cryptoCurrency || 'ETH'
      
      let wallet
      try {
        wallet = generateWallet(cryptoType)
      } catch (walletError) {
        console.error('Wallet generation error:', walletError)
        return apiSuccess({ error: 'Failed to generate wallet: ' + (walletError instanceof Error ? walletError.message : 'Unknown error') }, { status: 500 })
      }
      
      let encryptedPrivateKey = null
      if (wallet.privateKey) {
        try {
          encryptedPrivateKey = encryptPrivateKey(wallet.privateKey)
        } catch (encryptError) {
          console.error('Encryption error:', encryptError)
          return apiError("Failed to encrypt private key", 500)
        }
      }
      
      await prisma.userWallet.create({
        data: {
          userId: session.user.id,
          cryptoType: cryptoType,
          address: wallet.address,
          privateKey: encryptedPrivateKey,
          publicKey: wallet.publicKey,
          isPrimary: false
        }
      })

      return NextResponse.json({
        success: true,
        walletAddress: wallet.address,
        cryptoCurrency: cryptoType,
        isNew: true,
        message: 'New address generated (old address kept)'
      })
    }

    if (action === 'setPaymentAddress' && paymentAddress) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { paymentAddress }
      })

      return NextResponse.json({
        success: true,
        paymentAddress
      })
    }

    if (action === 'addCredit' && body.credit !== undefined) {
      return apiSuccess({
        success: true
      })
    }

    return apiError("Invalid action", 400)
  } catch (error) {
    console.error('Error updating wallet:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update wallet: ' + errorMessage }, { status: 500 })
  }
}
