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
  const { receiverId, content } = await req.json()

  if (!receiverId || !content) {
    return apiError('Receiver and content required', 400)
  }

  const message = await sendMessage(session.user.id, receiverId, content)
  return apiSuccess({ message }, 201)
})
