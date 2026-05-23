import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sseManager } from '@/lib/sse'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      sseManager.add(userId, controller)

      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'))
        } catch {
          clearInterval(keepalive)
        }
      }, 30000)

      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        sseManager.remove(userId, controller)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
