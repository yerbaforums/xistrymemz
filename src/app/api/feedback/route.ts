import { apiSuccess, apiError, handleApi, requireAuth, getAuthSession } from '@/lib/api-helpers'
import { addFeedback, listUserFeedback, listFeedback } from '@/services/feedbackService'

export async function POST(req: Request) {
  return handleApi(async () => {
    const body = await req.json()

    if (!body.category || typeof body.category !== 'string') {
      throw new Error('Category is required')
    }
    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      throw new Error('Message is required')
    }

    let userId: string | undefined
    let email: string | undefined
    try {
      const { userId: uid } = await requireAuth()
      userId = uid
    } catch {
      if (!body.email || typeof body.email !== 'string') {
        throw new Error('Email is required for anonymous submissions')
      }
      email = body.email
    }

    const entry = await addFeedback({
      category: body.category,
      message: body.message.trim(),
      email,
      screenshot: body.screenshot,
      userId
    })

    return entry
  })
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    if (session.user.role === 'ADMIN') {
      const entries = await listFeedback({ status })
      return apiSuccess(entries)
    }

    const entries = await listUserFeedback(session.user.id)
    return apiSuccess(entries)
  } catch {
    return apiError('Failed to fetch feedback', 500)
  }
}
