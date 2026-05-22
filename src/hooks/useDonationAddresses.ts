'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { DonationAddr } from '@/types/product'

export function useDonationAddresses() {
  const { data: session } = useSession()
  const [addresses, setAddresses] = useState<DonationAddr[]>([])

  useEffect(() => {
    if (session?.user) {
      fetch('/api/users/donations')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.addresses) setAddresses(data.addresses) })
        .catch(() => {})
    }
  }, [session])

  return addresses
}