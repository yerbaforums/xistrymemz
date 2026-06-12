import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("Valid email required", 400)
    }

    await prisma.contactMessage.create({
      data: {
        name: email,
        email,
        subject: 'newsletter',
        message: `Newsletter subscription from ${email}`,
      },
    })

    return apiSuccess({ success: true })
  } catch {
    return apiError("Internal error", 500)
  }
}
