const MENTION_REGEX = /@(\w{2,50})/g

export function parseMentions(text: string): string[] {
  const mentions: string[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const username = match[1].toLowerCase()
    if (!seen.has(username)) {
      seen.add(username)
      mentions.push(username)
    }
  }
  return mentions
}

export function renderMentions(text: string, userMap: Map<string, string>): string {
  return text.replace(MENTION_REGEX, (_, username: string) => {
    const uid = userMap.get(username.toLowerCase())
    if (uid) {
      return `<a href="/profile/${uid}" class="mention-link" data-userid="${uid}">@${username}</a>`
    }
    return `@${username}`
  })
}

export function getSelectionAfterAt(
  element: HTMLTextAreaElement
): { start: number; query: string } | null {
  const pos = element.selectionStart
  const text = element.value
  const before = text.slice(0, pos)

  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) return null

  const afterAt = before.slice(atIdx + 1)
  if (/[\s]/.test(text[atIdx - 1] ?? '') && /^[a-zA-Z0-9_]{0,50}$/.test(afterAt)) {
    return { start: atIdx + 1, query: afterAt }
  }

  return null
}
