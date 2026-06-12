import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let settings = await prisma.platformSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          platformFeePercent: 10,
          enableCheckout: true,
          enableWallet: true
        }
      })
    }

    return NextResponse.json({
      enableCheckout: settings.enableCheckout,
      enableWallet: settings.enableWallet,
      platformFeePercent: settings.platformFeePercent
    })
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return NextResponse.json({ 
      enableCheckout: true, 
      enableWallet: true 
    }, { status: 200 })
  }
}