import { apiSuccess, handleApi, requireAdmin } from '@/lib/api-helpers'
import { markReviewed } from '@/services/feedbackService'

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    await requireAdmin()
    const { id } = await context.params
    const result = await markReviewed(id)
    if (!result) throw new Error('Feedback not found')
    return { id, status: 'REVIEWED' }
  })
}
