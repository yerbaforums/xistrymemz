import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getSiteDonationAddresses } from '@/lib/site-donations'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return apiSuccess({ addresses: await getSiteDonationAddresses() })
  } catch (error) {
    console.error('Error fetching site donation addresses:', error)
    return apiError('Failed to fetch', 500)
  }
}
