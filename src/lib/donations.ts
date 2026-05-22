import type { DonationAddr } from '@/types/product'

export function parseDonationAddresses(json: string | null | undefined): DonationAddr[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.map((a: any, i: number) => ({
      id: a.id || `addr-${i}`,
      currency: a.currency || 'ETH',
      address: a.address || '',
      label: a.label || null,
      qrCodeUrl: a.qrCodeUrl || null,
      showQR: a.showQR ?? true,
      sortOrder: a.sortOrder ?? i,
    }))
  } catch {
    return []
  }
}

export function serializeDonationAddresses(addresses: DonationAddr[]): string {
  return JSON.stringify(addresses.map(a => ({
    currency: a.currency,
    address: a.address,
    label: a.label,
  })))
}

export function donationAddressesToLegacy(addresses: DonationAddr[]): { donationAddress: string | null; donationCurrency: string } {
  if (addresses.length === 0) return { donationAddress: null, donationCurrency: 'ETH' }
  return {
    donationAddress: addresses[0].address,
    donationCurrency: addresses[0].currency,
  }
}

export function hydrateDonationAddresses(
  donationAddress: string | null | undefined,
  donationCurrency: string | null | undefined,
  donationAddressesJson: string | null | undefined,
): DonationAddr[] {
  const parsed = parseDonationAddresses(donationAddressesJson)
  if (parsed.length > 0) return parsed
  if (donationAddress) {
    return [{
      id: 'legacy-0',
      currency: donationCurrency || 'ETH',
      address: donationAddress,
      label: null,
      qrCodeUrl: null,
      showQR: true,
      sortOrder: 0,
    }]
  }
  return []
}