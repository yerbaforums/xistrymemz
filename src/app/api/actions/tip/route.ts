import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SUPPORTED_CRYPTOS } from '@/lib/constants'

const VALID_TYPES = ['POST','PRODUCT','SERVICE','EVENT','PROJECT','REQUEST','SCHOOLCONTENT','GROUP','SHOP']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { entityType, entityId, amount, currency } = await request.json()
    if (!entityType || !entityId || !amount) {
      return apiError("Missing required fields", 400)
    }

    const type = entityType.toUpperCase()
    if (!VALID_TYPES.includes(type)) {
      return apiError("Invalid entity type", 400)
    }

    const tipCurrency = currency ? String(currency).toUpperCase() : 'XTM'
    if (!SUPPORTED_CRYPTOS.includes(tipCurrency)) {
      return apiError("Invalid currency", 400)
    }

    const tip = await prisma.entityTip.create({
      data: {
        userId: session.user.id,
        entityType: type,
        entityId,
        amount: parseFloat(amount),
        currency: tipCurrency,
      },
    })

    return apiSuccess({ tip })
  } catch (error) {
    console.error('Tip error:', error)
    return apiError("Internal server error", 500)
  }
}
