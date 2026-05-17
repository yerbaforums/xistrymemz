'use client'

import Link from 'next/link'
import { Fragment } from 'react'

interface HashtagTextProps {
  text: string
  mentionLinks?: boolean
  truncate?: number
}

export default function HashtagText({ text, mentionLinks, truncate }: HashtagTextProps) {
  const content = truncate && text.length > truncate ? text.slice(0, truncate) + '...' : text
  const parts = content.split(/(#\w{2,50}|@\w{2,50})/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#') && part.length >= 3) {
          const tag = part.slice(1).toLowerCase()
          return (
            <Link key={i} href={`/hashtag/${tag}`} className="hashtag-link" onClick={e => e.stopPropagation()}>
              {part}
            </Link>
          )
        }
        if (mentionLinks && part.startsWith('@') && part.length >= 3) {
          const username = part.slice(1)
          return (
            <Link key={i} href={`/profile/${username}`} className="mention-link" onClick={e => e.stopPropagation()}>
              {part}
            </Link>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}
