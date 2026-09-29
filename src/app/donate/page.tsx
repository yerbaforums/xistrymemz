import Link from 'next/link'
import styles from './page.module.css'
import { DonateAddresses } from './DonateAddresses'
import Breadcrumbs from '@/components/Breadcrumbs'
import { getSiteDonationAddresses } from '@/lib/site-donations'
import { getCryptoPrices } from '@/lib/prices'
import {
  MONTHLY_BURN_USD,
  EXTRA_BURN_USD,
  SUGGESTED_RECURRING_USD,
  monthlyBurnTotal,
  isConfigured,
  daysCoveredBy,
  formatUsd,
} from '@/lib/funding'

// Prices are fetched live from CoinGecko; a static render would freeze the USD
// anchors at build time and start lying within minutes. The underlying module
// caches for 60s, so this is at most one upstream request per minute.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Donate — XistrYmemZ',
  description:
    'Fund the XistrYmemZ cooperative platform. 0% fees, no ads, no investors, no token. Itemised infrastructure costs, direct wallet addresses, MIT licensed source.',
}

export default async function DonatePage() {
  // Independent lookups: neither depends on the other, so do not serialise them.
  const [addresses, priceList] = await Promise.all([
    getSiteDonationAddresses(),
    getCryptoPrices().catch(() => []),
  ])

  const prices: Record<string, number> = {}
  for (const p of priceList) prices[p.symbol] = p.price

  const configured = isConfigured()
  const burn = monthlyBurnTotal()
  const days = daysCoveredBy(SUGGESTED_RECURRING_USD)
  const items = [...MONTHLY_BURN_USD, ...EXTRA_BURN_USD]

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Donate' }]} />

      <section className={styles.hero}>
        <span className={styles.heroIcon}>💎</span>
        <h1>Fund the platform</h1>
        <p>
          XistrYmemZ takes <strong>0%</strong> of every transaction and runs on
          donations. There is no fee revenue, no advertising, no investor and no
          token — so what you give here is what pays for the infrastructure.
        </p>
      </section>

      {/* ── Why crypto-only is the point, not a limitation ── */}
      <section className={styles.block}>
        <h2>Why we only accept private money</h2>
        <p>
          Card processors and payment platforms take 2.9–3.5%, freeze accounts on
          their own discretion, and build a dossier on every transaction. A
          platform that promises to never take a cut or sell your data cannot
          then hand that data to a processor — so we ask directly instead.
        </p>
        <ul className={styles.pillars}>
          <li><strong>0% fees</strong><span>No processor markup, ever</span></li>
          <li><strong>No custody</strong><span>We never hold your funds</span></li>
          <li><strong>No KYC</strong><span>Nothing to submit, nothing to leak</span></li>
          <li><strong>Nothing to freeze</strong><span>No account can be shut off</span></li>
        </ul>
      </section>

      {/* ── Transparency: the whole point of this page ── */}
      <section className={styles.block}>
        <h2>What your donation pays for</h2>
        {configured ? (
          <>
            <p className={styles.burnLead}>
              The platform costs <strong>{formatUsd(burn)}</strong> per month to
              keep running. That is the entire number — there is no staff, no
              marketing budget, and no revenue coming in against it.
            </p>
            <ul className={styles.burnList}>
              {items.map(item => (
                <li key={item.label}>
                  <span className={styles.burnLabel}>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
                    ) : (
                      item.label
                    )}
                  </span>
                  <span className={styles.burnAmount}>{formatUsd(item.amountUsd)}</span>
                </li>
              ))}
              <li className={styles.burnTotal}>
                <span className={styles.burnLabel}>Total per month</span>
                <span className={styles.burnAmount}>{formatUsd(burn)}</span>
              </li>
            </ul>
            {days != null && (
              <p className={styles.recurring}>
                A standing order of{' '}
                <strong>{formatUsd(SUGGESTED_RECURRING_USD)}/month</strong> covers
                about <strong>{days} days</strong> of the above. Small recurring
                amounts are far more useful to us — and harder to regret — than a
                single large one.
              </p>
            )}
          </>
        ) : (
          <p className={styles.pending}>
            We&apos;re publishing the itemised infrastructure bill here — every
            invoice, line by line, so you can check it against the provider
            dashboards yourself. Until it&apos;s up, the addresses below are the
            source of truth and we&apos;ll happily answer questions about where
            the money goes.
          </p>
        )}
      </section>

      {/* ── Addresses: server-rendered so they exist without JS ── */}
      <section className={styles.block}>
        <h2>Send directly to an address</h2>
        <p>
          No form, no account, no intermediary. Copy the address or scan the QR
          code and send from any wallet. Verify the first and last characters
          before sending — we cannot reverse a transfer.
        </p>
        <DonateAddresses addresses={addresses} prices={prices} />
        <p className={styles.fineprint}>
          These are the same addresses shown in the site footer, and they are
          fixed — we will never ask you to send to a different one.
        </p>
      </section>

      {/* ── Proof of life ── */}
      <section className={styles.block}>
        <h2>Where the money shows up</h2>
        <p>
          The code is MIT licensed and public, so nothing here needs to be taken
          on trust:
        </p>
        <ul className={styles.links}>
          <li>
            <a href="https://github.com/yerbaforums/xistrymemz" target="_blank" rel="noopener noreferrer">
              Read the source
            </a>{' '}
            — every commit, every change, no private repository
          </li>
          <li>
            <Link href="/about">Read the promises</Link> — no ads, no data
            selling, no AI training on your content, no algorithmic feed
          </li>
          <li>
            <Link href="/feedback">Ask us anything</Link> — including where the
            money goes
          </li>
        </ul>
        <p className={styles.honest}>
          Being straight about scale: the platform has a small member base right
          now and most of the codebase was written before there was anyone using
          it. Donations buy infrastructure, not growth. We&apos;d rather you know
          that before you give than find out after.
        </p>
      </section>
    </div>
  )
}
