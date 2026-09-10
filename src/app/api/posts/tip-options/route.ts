import { apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const TIP_OPTIONS = [
  { symbol: 'XTM', name: 'Tari', icon: '/crypto-logos/tari.png', color: '#8B5CF6' },
  { symbol: 'XMR', name: 'Monero', icon: '/crypto-logos/monero.png', color: '#FF6600' },
  { symbol: 'ZANO', name: 'Zano', icon: '/crypto-logos/zano.png', color: '#4A90D9' },
  { symbol: 'FUSD', name: 'Freedom Dollar', icon: '/crypto-logos/freedom-dollar.png', color: '#22A06B' },
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return apiError("Unauthorized", 401)
    }

    return NextResponse.json({
      tipOptions: TIP_OPTIONS
    })
  } catch (error) {
    console.error('Error fetching tip options:', error)
    return apiError("Failed to fetch tip options", 500)
  }
}