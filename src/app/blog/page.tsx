import { redirect } from 'next/navigation'

// Bare /blog has no index — the blog directory lives at /blogs.
export default function BlogIndexRedirect() {
  redirect('/blogs')
}
