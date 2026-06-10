import { apiSuccess, apiError, withAuth } from '@/lib/api-helpers'
import { getMessagesBetweenUsers, markMessagesAsRead, sendMessage } from '@/services/messageService'

export const GET = withAuth(async (req, session, context) => {
  const userId = context.searchParams.get('user')

  if (!userId) {
    return apiError('User ID required', 400)
  }

  const messages = await getMessagesBetweenUsers(session.user.id, userId)
  await markMessagesAsRead(userId, session.user.id)

  return apiSuccess({ messages })
})

export const POST = withAuth(async (req, session) => {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }
    const { receiverId, content } = body as any

    if (!receiverId || !content) {
      return apiError('Receiver and content required', 400)
    }

    const message = await sendMessage(session.user.id, receiverId, content)
    return apiSuccess({ message }, 201)
  } catch (error) {
    console.error('Send message error:', error)
    return apiError('Failed to send message', 500)
  }
})
