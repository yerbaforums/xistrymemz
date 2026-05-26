import { redirect } from 'next/navigation'

export default function PublicPlansRedirect() {
  redirect('/projects')
}
