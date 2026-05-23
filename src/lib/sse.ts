const encoder = new TextEncoder()

class SSEClientManager {
  private clients = new Map<string, Set<ReadableStreamDefaultController>>()

  add(userId: string, controller: ReadableStreamDefaultController) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(controller)
  }

  remove(userId: string, controller: ReadableStreamDefaultController) {
    this.clients.get(userId)?.delete(controller)
  }

  emit(userId: string, data: string) {
    for (const controller of this.clients.get(userId) || []) {
      try {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      } catch {
        this.clients.get(userId)?.delete(controller)
      }
    }
  }
}

export const sseManager = new SSEClientManager()
