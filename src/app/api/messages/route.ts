import { apiSuccess, apiError, withAuth } from '@/lib/api-helpers'
import { getMessagesBetweenUsers, markMessagesAsRead, sendMessage } from '@/services/messageService'
import { createNotification } from '@/services/notificationService'

export const GET = withAuth(async (req, session, context) => {
  const userId = context.searchParams.user

  if (!userId) {
    return apiError('User ID required', 400)
  }

  const messages = await getMessagesBetweenUsers(session.user.id, userId)
  await markMessagesAsRead(userId, session.user.id)

  return apiSuccess({ messages })
})

export const POST = withAuth(async (req, session) => {
  try {
    let body: { receiverId?: string; content?: string }
    try {
      body = (await req.json()) as { receiverId?: string; content?: string }
    } catch {
      return apiError('Invalid JSON body', 400)
    }
    const { receiverId, content } = body

    if (!receiverId || !content) {
      return apiError('Receiver and content required', 400)
    }

    const message = await sendMessage(session.user.id, receiverId, content)

    // Notify the receiver (pref-gated: Settings → Notifications → Messages).
    // Failure must never break message delivery.
    try {
      const preview = content.length > 120 ? `${content.slice(0, 120)}…` : content
      await createNotification({
        type: 'NEW_MESSAGE',
        userId: receiverId,
        actorId: session.user.id,
        entityId: message.id,
        entityType: 'MESSAGE',
        title: 'New Message',
        message: `${(message.sender as { name?: string | null })?.name || 'Someone'}: ${preview}`,
        link: `/dashboard/messages?user=${session.user.id}`,
      })
    } catch {
      // silent — message was already delivered
    }

    return apiSuccess({ message }, 201)
  } catch (error) {
    console.error('Send message error:', error)
    return apiError('Failed to send message', 500)
  }
})
