import { redirect } from 'next/navigation'

// Bare /podcast has no index — the podcast directory lives at /podcasts.
export default function PodcastIndexRedirect() {
  redirect('/podcasts')
}
