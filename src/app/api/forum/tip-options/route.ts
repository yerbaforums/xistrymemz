import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        balance: true,
        wallets: {
          select: {
            id: true,
            cryptoType: true,
            address: true,
            isPrimary: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const cryptoBalances = [
      { symbol: 'XMR', name: 'Monero', available: user.balance, icon: '/crypto-logos/monero.png', color: '#FF6600' },
      { symbol: 'XTM', name: 'Tari', available: user.balance * 100, icon: '/crypto-logos/tari.png', color: '#8B5CF6' },
      { symbol: 'ARRR', name: 'Pirate Chain', available: user.balance * 200, icon: '/crypto-logos/pirate-chain.png', color: '#000000' },
      { symbol: 'DERO', name: 'Dero', available: user.balance * 50, icon: '/crypto-logos/dero.png', color: '#2F3854' },
      { symbol: 'ZANO', name: 'Zano', available: user.balance * 25, icon: '/crypto-logos/zano.png', color: '#4A90D9' },
      { symbol: 'USDT', name: 'Tether', available: user.balance, icon: '/crypto-logos/tether.png', color: '#26A17B' },
      { symbol: 'USDC', name: 'USD Coin', available: user.balance, icon: '/crypto-logos/usd-coin.png', color: '#2775CA' },
      { symbol: 'ETH', name: 'Ethereum', available: user.balance / 2000, icon: '/crypto-logos/ethereum.png', color: '#627EEA' },
      { symbol: 'BTC', name: 'Bitcoin', available: user.balance / 50000, icon: '/crypto-logos/bitcoin.png', color: '#F7931A' },
    ]

    return NextResponse.json({
      usdBalance: user.balance || 0,
      wallets: user.wallets || [],
      cryptoBalances
    })
  } catch (error) {
    console.error('Error fetching tip options:', error)
    return NextResponse.json({ error: 'Failed to fetch tip options' }, { status: 500 })
  }
}