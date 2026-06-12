import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getCryptoPrices } from '@/lib/prices'

export async function GET() {
  try {
    const prices = await getCryptoPrices()
    return NextResponse.json({
      prices,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching prices:', error)
    return apiError("Failed to fetch prices", 500)
  }
}