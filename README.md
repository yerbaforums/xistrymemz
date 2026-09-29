<div align="center">

# 🪐 XistrYmemZ

**Bringing back the directory internet.**

An open-source, member-owned cooperative platform — marketplace, services,
projects, groups, schools and media in one place, with **zero platform fees**
and direct private-money payments.

[Live site](https://xistrymemz.xyz) · [Donate](https://xistrymemz.xyz/donate) · [MIT licensed](LICENSE) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why this exists

Every marketplace extracts. Etsy takes 6.5% plus payment processing, eBay 13%+,
Amazon 15–45%. The seller does the work; the platform takes the cut. Most
"alternatives" just move the fee around.

XistrYmemZ takes **0%** and never touches your money. Sellers set a payout
address, buyers pay directly wallet-to-wallet, and the platform is sustained by
voluntary donations. No VC, no token, no advertising, no data selling, no
algorithmic feed.

## What it does

| Area | Capability |
|---|---|
| **Marketplace** | Products, services, rentals, custom-URL shops, group buys |
| **Payments** | Direct wallet-to-wallet in XMR, ARRR, DERO, ZANO, XTM, FIRO, BTC, ETH, USDT/USDC. Optional escrow. No processor, no KYC, no custody. |
| **Projects & requests** | Goals, milestones, collaborators, funding, offers, barter |
| **Directory** | Phonebook pages (White/Yellow/Blue/Green/Violet) + map discovery, sortable by name, newest, or nearest |
| **Earth Passport** | Portable identity, reputation badges, 14 user classes, opt-in location, privacy controls |
| **Boards** | Location-based community bulletin boards with map pins |
| **Social** | Chronological feed, hashtag discovery, quote-posts, connections, messaging |
| **School & blogs** | Courses, lessons, paid tiers, subscriptions; long-form writing |
| **Media** | Podcasts with per-show RSS, photos, P2P video/audio rooms, link embeds |
| **Operations** | Bookings, appointments, planner, events with QR ticketing, courier deals, CSV export |

Also: 16 locales, PWA/offline shell, sitemap + structured SEO, first-party
analytics, i18n via `next-intl`.

## Stack

Next.js 16 · React 19 · TypeScript · Prisma 6 · PostgreSQL (Neon) ·
NextAuth v4 · next-intl · Leaflet/OpenStreetMap · `simple-peer` (WebRTC) ·
Sharp + Pinata/IPFS · Zod · Jest

## Running it locally

```bash
git clone https://github.com/yerbaforums/xistrymemz
cd xistrymemz
npm install
cp .env.example .env      # fill in DATABASE_URL + NEXTAUTH_SECRET at minimum
npx prisma db push       # dev only — use `migrate` for anything real
npm run dev
```

Open <http://localhost:3000>. Only `DATABASE_URL` and `NEXTAUTH_SECRET` are
required to boot; the rest wire up OAuth providers, email (Resend), and IPFS.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Jest (live-server suites skip when no server is up) |
| `npm run db:push` / `db:migrate` / `db:studio` | Prisma |

## Funding

The platform runs on donations — there is no fee revenue, no ads, and no
investor. Infrastructure (Vercel, Neon, Pinata) is itemized publicly on the
donate page, along with a ledger of what's been received.

Donations are accepted in **XMR, ZANO, ARRR, DERO, XTM and FUSD**. No
processor, no custody, no KYC.

→ <https://xistrymemz.xyz/donate>

## Contributing

Issues labelled `good first issue` are a genuine starting point. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, the gates every change must pass,
and where help is most wanted (UI/UX, mobile, tests, docs, ActivityPub).

## Status

Early. The code is far ahead of the community — see the honest numbers on the
homepage rather than taking the feature list as evidence of traction. Built in
public.

## License

[MIT](LICENSE) © 2026 XistrYmemZ
