const HASHTAG_REGEX = /#(\w{2,50})/g

export function extractHashtags(text: string): string[] {
  const tags: string[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    const tag = match[1].toLowerCase()
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }
  return tags
}
