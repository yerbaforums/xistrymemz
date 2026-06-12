import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { fetchApi } from '@/lib/fetch-api'
import type { DonationAddr } from '@/types/product'

export function useDonationAddresses() {
  const { data: session } = useSession()
  const [addresses, setAddresses] = useState<DonationAddr[]>([])

  useEffect(() => {
    if (session?.user) {
      fetchApi<{ addresses: DonationAddr[] }>('/api/users/donations')
        .then(({ addresses: addrs }) => setAddresses(addrs || []))
        .catch(() => {})
    }
  }, [session])

  return addresses
}