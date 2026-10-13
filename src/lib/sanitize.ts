import DOMPurify from 'dompurify'

/**
 * Strip scripts, event handlers and other dangerous markup before
 * rendering user-authored rich text via dangerouslySetInnerHTML.
 * Works on both the server (SSR / RSC) and the client.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty)
}
