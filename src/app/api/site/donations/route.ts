import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    return NextResponse.json({ addresses: donationAddresses })
  } catch (error) {
    console.error('Error fetching site donation addresses:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
