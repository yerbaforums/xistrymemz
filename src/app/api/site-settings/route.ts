import { NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let settings = await prisma.platformSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          enableCheckout: true
        }
      })
    }

    return NextResponse.json({
      enableCheckout: settings.enableCheckout
    })
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return NextResponse.json({ 
      enableCheckout: true
    }, { status: 200 })
  }
}