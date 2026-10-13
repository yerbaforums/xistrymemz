<div align="center">

# 🪐 XistrYmemZ

**Bringing back the directory internet.**

An open-source, member-owned cooperative platform — marketplace, directory,
social, projects, groups, schools and media in one place, with **zero
platform fees** and direct private-money payments.

[Live site](https://xistrymemz.xyz) · [Donate](https://xistrymemz.xyz/donate) · [AGPL-3.0-or-later licensed](LICENSE) · [Contributing](CONTRIBUTING.md)

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
| **Payments** | Direct wallet-to-wallet in Monero (XMR), Minotari (XTM), Zano (ZANO) and Freedom Dollar (FUSD). No processor, no custody, no KYC. |
| **Projects & requests** | Goals, milestones, collaborators, funding, offers, barter |
| **Directory** | Phonebook pages (White/Yellow/Blue/Green/Violet) + map discovery, sortable by name, newest, or nearest |
| **Earth Passport** | Portable identity, reputation badges, 14 user classes, opt-in location, privacy controls |
| **Boards** | Location-based community bulletin boards with map pins |
| **Groups** | Member-run groups with their own feeds, member activity, and join flows |
| **Social** | Chronological feed, hashtag discovery, quote-posts, author tips, connections, messaging, notifications, saved items |
| **School & blogs** | Courses, lessons, paid tiers, subscriptions; long-form writing |
| **Media** | Podcasts with per-show RSS, photos, P2P video/audio rooms, link embeds |
| **Operations** | Bookings, appointments, trips planner (custom stops on a map), events with QR ticketing, courier deals, CSV export |
| **Dashboard** | Per-member hub: overview gauges, action queue, saved items, a deals pipeline with search/filter/sort and pipeline value, a planner with status & past filters |
| **Admin** | First-party analytics (referrers, countries, top pages, date ranges, CSV export), durable IPFS backups, moderation (reports), badges, invite codes, subscribers & user management |

Also: 16 locales, PWA/offline shell, sitemap + structured SEO, privacy-first
first-party analytics, i18n via `next-intl`, ActivityPub endpoints (wiring
in progress).

## How it's structured

One account, four surfaces. The **public site** is the front door; the
**member areas** are where everything happens; the **dashboard hub** is where a
member runs their own corner of the platform; the **admin panel** keeps the
whole thing running. The **Earth Passport** is the single identity that follows
a member across all of them.

```mermaid
flowchart TB
  Home[🏠 Homepage] --> Directory[📖 Directory — phonebook + map] & Discover[🧭 Discover] & Search[🔍 Search]

  subgraph Members[Member areas]
    Social[💬 Social<br/>feed · hashtags · boards<br/>groups · tips · messages]
    Economy[🛒 Economy — 0% platform fee<br/>products · services · rentals<br/>shops · group buys · barter]
    Create[🎓 Learn + create<br/>school · blogs · podcasts<br/>P2P video/audio rooms]
    Plan[📅 Plan + meet<br/>events + QR tickets · appointments<br/>trips planner · courier]
    Projects[🎯 Projects + requests<br/>goals · funding · offers]
  end

  Passport[🛂 Earth Passport<br/>identity · reputation · privacy] --- Members
  Dashboard[🕹️ Dashboard hub] -.-> Members
  Admin[🛡️ Admin panel] -.-> Members
```

Money never routes through the platform. A buyer sends coins straight to the
seller's wallet and both sides mark the order settled; what keeps the platform
alive is donations, not fees:

```mermaid
flowchart LR
  Buyer[Buyer] -->|Monero · Minotari · Zano · Freedom Dollar| Seller[Seller's wallet — keeps 100%]
  Donors[Voluntary donations] --> Platform[Platform — 0% fees · no custody · no KYC]
```

## Stack

Next.js 16 · React 19 · TypeScript · Prisma 6 · PostgreSQL (Neon) ·
NextAuth v4 · next-intl · Leaflet/OpenStreetMap · `simple-peer` (WebRTC) ·
Sharp + Pinata/IPFS · Zod · Jest

```mermaid
flowchart TB
  UI[Browser · PWA<br/>Next.js 16 + React 19 · 16 locales] --> Server[Next.js server<br/>pages · API routes · NextAuth v4<br/>cron · ActivityPub]
  Server --> DB[(Neon PostgreSQL — Prisma 6)]
  Server --> Pinata[Pinata — IPFS] & Resend[Resend — email] & DeepL[DeepL — translation]
  UI --> Maps[OpenStreetMap] & WebRTC[simple-peer — P2P rooms]
```

### Repository layout

```
src/
├── app/          # Pages, API routes, admin, cron
├── components/   # Shared UI (filters, modals, pickers)
├── hooks/        # useVideoChat (WebRTC + screen share), …
├── lib/          # constants, auth, ipfs, media, i18n routing
├── services/     # backupService (dumps, encryption, IPFS)
├── i18n/         # locale routing + message loading
prisma/           # schema.prisma
public/           # crypto-logos, PWA manifest
scripts/          # decrypt-backup.mjs (offline restore)
```

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

## Environment variables

Copy `.env.example` to `.env` and fill in the blanks — the committed example
holds placeholders only, never real secrets. Only `DATABASE_URL` and
`NEXTAUTH_SECRET` are required to boot.

| Variable | Required | Purpose | Default / example |
|---|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/xistrymemz` |
| `NEXTAUTH_SECRET` | ✅ | NextAuth session signing secret | generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | | Canonical origin — auth callbacks, email links, feeds, federation, CORS | `http://localhost:3000` |
| `ADMIN_EMAILS` / `ADMIN_NAMES` | | Comma-separated emails (and names) granted admin on sign-in | `ada@example.com,bob@example.com` |
| OAuth pairs (`GOOGLE_`/`GITHUB_`/`DISCORD_`/`TWITTER_`/`FACEBOOK_` `CLIENT_ID`+`CLIENT_SECRET`) | | Social sign-in — each provider is registered only when both values are set | (empty) |
| `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` | | IPFS pinning — required for durable backups and IPFS media; without them backups are local-only | (empty) |
| `IPFS_GATEWAY` | | Public gateway for CID downloads and media links | `https://gateway.pinata.cloud` |
| `IPFS_API_URL` | | Local IPFS node HTTP API for self-hosted pinning | `http://127.0.0.1:5001` |
| `BACKUP_ENCRYPTION_KEY` | for backups | AES-256-GCM key — dumps are encrypted before they touch disk or IPFS; backups refuse to run without it | `openssl rand -base64 32` |
| `IPFS_PIN_URL` | | Pin backups to your own IPFS node (kubo RPC URL) instead of Pinata | (empty) |
| `RESEND_API_KEY` | | Transactional email (notifications, verification) | (empty) |
| `EMAIL_FROM` | | Sender address for emails | `noreply@xistrymemz.xyz` |
| `DEEPL_API_KEY` | | Machine translation for missing locales | (empty) |
| `CRON_SECRET` | | Bearer token authorizing `/api/cron/*` routes | (empty) |
| `NEXT_PUBLIC_MAX_VIDEO_DURATION_SEC` | | Cap on uploaded video, in seconds | `900` (15 min) |

### Backups

The admin **Backups** page snapshots the database. Every dump is encrypted
before it leaves the server (AES-256-GCM via `BACKUP_ENCRYPTION_KEY`), so the
pinned IPFS copy is ciphertext — a leaked CID reveals nothing without the key.

Decentralized storage, any of:

- **Pinata** — managed pinning; set both API keys.
- **Your own IPFS node** — set `IPFS_PIN_URL` to a kubo RPC URL; no third party.
- **Manual** — download the ciphertext from a CID and keep it offline.

Automatic backups: point a cron provider at `/api/cron/backup` with
`CRON_SECRET` (query param or Bearer token). Offline restore:
`BACKUP_ENCRYPTION_KEY=… node scripts/decrypt-backup.mjs backup.enc -o restored.sql.gz`.
Deleting a backup (or retention cleaning it up) removes the local file **and**
unpins the remote copy from Pinata / your own node.

```mermaid
flowchart TB
  Dump[DB dump — gzip] --> Enc[🔒 Encrypt — AES-256-GCM]
  Enc --> Target{Backup target?}
  Target -->|Pinata keys| Pinata[Pinned ciphertext — real CID]
  Target -->|IPFS_PIN_URL| Node[Your own IPFS node — real CID]
  Target -->|none| Local[local- CID — not durable]
  Pinata & Node --> DL[⬇ Download — authed route, decrypted server-side]
  Pinata & Node --> GW[🌐 Gateway — ciphertext, restore offline with the key]
  Local --> L[⬇ Only on the creating instance · Local-only badge]
```

> Backups taken before encryption landed were pinned as plaintext — unpin
> them from the Pinata dashboard and take a fresh backup.

## Funding

The platform runs on donations — there is no fee revenue, no ads, and no
investor. Infrastructure (Vercel, Neon, Pinata) is itemized publicly on the
donate page, along with a ledger of what's been received.

Donations are accepted in **Monero, Minotari, Zano and Freedom Dollar**. No
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

[AGPL-3.0-or-later](LICENSE) © 2026 XistrYmemZ — free software: run it, study it, share it; copyleft keeps hosted use open.
