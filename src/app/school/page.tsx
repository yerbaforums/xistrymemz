import { redirect } from 'next/navigation'

// Bare /school has no index — the school directory lives at /schools.
export default function SchoolIndexRedirect() {
  redirect('/schools')
}
