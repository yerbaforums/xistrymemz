import { apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CRYPTO_ICONS } from '@/lib/crypto-icons'

const TIP_OPTIONS = Object.values(CRYPTO_ICONS).map(({ symbol, name, icon, color }) => ({
  symbol, name, icon, color
}))

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