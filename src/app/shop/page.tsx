import { redirect } from 'next/navigation'

// Bare /shop has no index — the shop directory lives at /shops.
export default function ShopIndexRedirect() {
  redirect('/shops')
}
