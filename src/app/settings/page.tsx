import { redirect } from 'next/navigation'

// /profile/settings is the settings hub — keep the old URL working via redirect.
export default function SettingsPage() {
  redirect('/profile/settings')
}
