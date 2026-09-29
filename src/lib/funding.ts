/**
 * Funding transparency config for /donate.
 *
 * ── ACTION REQUIRED BEFORE ANNOUNCING /donate ──────────────────────────────
 * Set the real figures in `MONTHLY_BURN_USD` below. They are `0` on purpose:
 * a donation page that publishes wrong costs is worse than no page at all, so
 * nothing is guessed here. Pull the actual numbers from the Vercel, Neon and
 * Pinata billing pages and fill them in.
 *
 * Until `isConfigured` is true, the transparency section renders an honest
 * "we're publishing the itemised bill" placeholder instead of fake numbers.
 * Everything else on the page (addresses, QR, why crypto-only) works as-is.
 *
 * Note: platform donations arrive directly at the wallet addresses below and
 * are therefore never recorded in the database — the `Payment` / tip /
 * `SponsorshipPayment` tables track member-to-member transfers, not money
 * given to run the platform. Any "received so far" figure must be stated by
 * hand and verified on-chain; do not derive it from the database.
 */

export interface BurnItem {
  label: string
  amountUsd: number
  href?: string
  note?: string
}

/** Itemised monthly infrastructure cost. Fill in from real invoices. */
export const MONTHLY_BURN_USD: BurnItem[] = [
  { label: 'Vercel (hosting)', amountUsd: 0, href: 'https://vercel.com/dashboard' },
  { label: 'Neon (PostgreSQL)', amountUsd: 0, href: 'https://console.neon.tech' },
  { label: 'Pinata (IPFS media)', amountUsd: 0, href: 'https://pinata.cloud' },
  { label: 'Domain + email', amountUsd: 0, href: 'https://resend.com' },
]

/** Optional extra lines (contractor time, hardware, audits). */
export const EXTRA_BURN_USD: BurnItem[] = []

/**
 * The number a single recurring donor should think against. Used to render
 * "X/mo covers N days of uptime" so the figure self-updates when the costs
 * above change. Keep the ask small — crypto donations are best as many small
 * standing orders, not a few large one-offs.
 */
export const SUGGESTED_RECURRING_USD = 5

export const monthlyBurnTotal = (): number =>
  [...MONTHLY_BURN_USD, ...EXTRA_BURN_USD].reduce((sum, i) => sum + (i.amountUsd || 0), 0)

export const isConfigured = (): boolean =>
  [...MONTHLY_BURN_USD, ...EXTRA_BURN_USD].every(i => (i.amountUsd || 0) > 0) &&
  monthlyBurnTotal() > 0

/** Days of runway a given monthly amount buys. Null until configured. */
export function daysCoveredBy(monthlyUsd: number): number | null {
  const burn = monthlyBurnTotal()
  if (burn <= 0) return null
  const daysInMonth = 30
  return Math.max(1, Math.round((monthlyUsd / burn) * daysInMonth))
}

/** Pegged assets are worth their peg; render them as exactly $1.00. */
const PEGGED = new Set(['USDT', 'USDC', 'FUSD'])

export function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * USD anchor shown next to a donation address.
 *
 * Pegged coins render as exactly $1.00 rather than the literal API value —
 * CoinGecko currently returns ~$0.999 for FUSD, and printing a stablecoin at
 * $0.999021 reads as a depeg scare rather than as accuracy. Sub-cent coins
 * (DERO trades near $0.008) need extra precision or the anchor rounds to $0.01
 * and looks broken.
 */
export function formatCryptoPrice(price: number | undefined, currency: string): string {
  if (price == null || !Number.isFinite(price)) return ''
  if (PEGGED.has(currency.toUpperCase())) return '$1.00'
  if (price >= 0.01) return formatUsd(price)
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
}
