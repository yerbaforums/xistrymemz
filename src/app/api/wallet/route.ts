import { NextResponse } from 'next/server'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        return NextResponse.json({ error: 'Failed to generate wallet: ' + (walletError instanceof Error ? walletError.message : 'Unknown error') }, { status: 500 })
      }
      
      let encryptedPrivateKey = null
      if (wallet.privateKey) {
        try {
          encryptedPrivateKey = encryptPrivateKey(wallet.privateKey)
        } catch (encryptError) {
          console.error('Encryption error:', encryptError)
          return NextResponse.json({ error: 'Failed to encrypt private key' }, { status: 500 })
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
        return NextResponse.json({ error: 'Failed to generate wallet: ' + (walletError instanceof Error ? walletError.message : 'Unknown error') }, { status: 500 })
      }
      
      let encryptedPrivateKey = null
      if (wallet.privateKey) {
        try {
          encryptedPrivateKey = encryptPrivateKey(wallet.privateKey)
        } catch (encryptError) {
          console.error('Encryption error:', encryptError)
          return NextResponse.json({ error: 'Failed to encrypt private key' }, { status: 500 })
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
      return NextResponse.json({
        success: true
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating wallet:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update wallet: ' + errorMessage }, { status: 500 })
  }
}
