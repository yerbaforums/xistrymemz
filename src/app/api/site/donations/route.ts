import { apiSuccess, apiError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { CRYPTO_LOGOS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.platformSettings.findFirst()
    let donationAddresses = []
    try {
      if (settings?.donationAddresses) {
        donationAddresses = JSON.parse(settings.donationAddresses)
      }
    } catch {
      donationAddresses = []
    }
    const supported = donationAddresses.filter(
      (da: { currency?: string }) =>
        da && typeof da.currency === 'string' && Boolean(CRYPTO_LOGOS[da.currency])
    )
    return apiSuccess({ addresses: supported })
  } catch (error) {
    console.error('Error fetching site donation addresses:', error)
    return apiError("Failed to fetch", 500)
  }
}
