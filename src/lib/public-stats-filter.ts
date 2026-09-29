import type { Prisma } from '@prisma/client'

/**
 * Public-facing counts must not be inflated by dev/sweep accounts or by
 * TEST-prefixed placeholder listings. Those records are deliberately kept
 * active (browser sweeps, booking/QR tests) — they are excluded from public
 * numbers here rather than deleted, because of FK references and because the
 * dev sweeps still need them.
 *
 * No schema change: identified purely by the dev email domain and a
 * TEST- prefix on the title. Adding a new dev account is enough to have it
 * excluded everywhere.
 */
export const DEV_EMAIL_DOMAIN = '@xistrymemz.test'

export const PUBLIC_STATS_FILTER = {
  /** Any account registered on the non-deliverable dev domain. */
  notTestEmail: {
    NOT: { email: { endsWith: DEV_EMAIL_DOMAIN } },
  },
  /** Placeholder listings created by the browser sweeps. */
  notTestTitle: {
    NOT: { title: { startsWith: 'TEST' } },
  },
} as const

/** Users safe to show as real members in public surfaces. */
export function publicUserWhere(extra: Prisma.UserWhereInput = {}): Prisma.UserWhereInput {
  return { AND: [PUBLIC_STATS_FILTER.notTestEmail, extra] }
}

/** Service offerings safe to count as real public services. */
export function publicServiceWhere(extra: Prisma.ServiceOfferingWhereInput = {}): Prisma.ServiceOfferingWhereInput {
  return { AND: [PUBLIC_STATS_FILTER.notTestTitle, extra] }
}
