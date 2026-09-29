import { prisma } from '@/lib/prisma'
import { CRYPTO_LOGOS } from '@/lib/constants'

/**
 * A platform-level donation address, as stored in the
 * `platformSettings.donationAddresses` JSON blob.
 *
 * Note this is the *site's* own addresses (set in /admin/settings), not the
 * per-user `DonationAddress` table rows that members manage on their profiles.
 */
export interface SiteDonationAddress {
  id: string
  currency: string
  address: string
  label: string | null
  showQR: boolean
}

/**
 * Single source of truth for the platform's public donation addresses.
 *
 * Previously the JSON.parse + CRYPTO_LOGOS filter was copy-pasted into
 * /api/site/donations and /api/admin/settings, which is how /donate ended up
 * duplicating it a third time. One implementation, one place to fix a parsing
 * bug.
 *
 * Returns an empty list rather than throwing on malformed JSON: a corrupted
 * settings blob must not take down the donation page, it should just show no
 * addresses (and /admin/settings still surfaces the raw string for repair).
 */
export async function getSiteDonationAddresses(): Promise<SiteDonationAddress[]> {
  const settings = await prisma.platformSettings.findFirst()
  if (!settings?.donationAddresses) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(settings.donationAddresses)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: (SiteDonationAddress & { sortOrder: number })[] = []
  parsed.forEach((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object') return
    const da = raw as Record<string, unknown>

    const currency = typeof da.currency === 'string' ? da.currency : ''
    // No logo means we have no asset to render and almost certainly an
    // unsupported/typo'd currency, so skip it rather than show a broken row.
    if (!currency || !CRYPTO_LOGOS[currency]) return

    const address = typeof da.address === 'string' ? da.address.trim() : ''
    // An empty address is worse than an absent one on a donation page: it
    // renders as a copyable empty string. Drop the row instead.
    if (!address) return

    out.push({
      // Sort order is meaningful here — it is the order the admin arranged the
      // rails in, and the order donors should read them in.
      id: typeof da.id === 'string' && da.id ? da.id : `${currency}-${index}`,
      currency,
      address,
      label: typeof da.label === 'string' ? da.label : null,
      showQR: da.showQR !== false,
      sortOrder: typeof da.sortOrder === 'number' ? da.sortOrder : index,
    })
  })

  return out
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _sortOrder, ...addr }) => addr)
}
