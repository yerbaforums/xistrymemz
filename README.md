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
  subgraph Public[Public site]
    Home[🏠 Homepage]
    Directory[📖 Directory — phonebook<br/>White · Yellow · Blue · Green · Violet<br/>+ map discovery]
    Discover[🧭 Discover]
    Search[🔍 Search]
  end

  subgraph Members[Member areas]
    subgraph Social[Social]
      Feed[Chronological feed]
      Hashtags[Hashtags]
      Boards[📌 Boards + map pins]
      Groups[👥 Groups]
      Msgs[💌 Connections + messaging]
      Tips[💸 Author tips]
    end
    subgraph Economy[Economy — 0% platform fee]
      Market[🛒 Products · services · rentals]
      Shops[🏪 Custom-URL shops]
      GroupBuys[Group buys]
      Barter[🤝 Barter offers]
      Requests[🎯 Projects, requests & funding]
    end
    subgraph Learn[Learn & create]
      School[🎓 Courses + paid tiers]
      Blogs[✍️ Blogs]
      Podcasts[🎙️ Podcasts + per-show RSS]
      Video[📹 P2P video/audio rooms]
    end
    subgraph Plan[Plan & meet]
      Events[📅 Events + QR ticketing]
      Appointments[📆 Appointments]
      Trips[🗺️ Trips planner + custom stops]
      Courier[🚚 Courier deals]
    end
  end

  Passport[🛂 Earth Passport<br/>identity · reputation badges · 14 classes<br/>opt-in location · privacy controls] --- Members

  Dashboard[🕹️ Dashboard hub<br/>overview gauges · action queue · saved<br/>deals — search / filter / sort + pipeline value<br/>planner — status + past filters] -.-> Members

  Admin[🛡️ Admin panel<br/>analytics + CSV · IPFS backups · reports<br/>badges · invite codes · subscribers · users] -.-> Members

  Reach[🌍 Reach<br/>16 locales · PWA/offline shell<br/>sitemap + structured SEO · feed.xml<br/>ActivityPub — wiring in progress] --- Members

  Public --> Members
```

Money never routes through the platform. A buyer sends coins straight to the
seller's wallet and both sides mark the order settled; what keeps the platform
alive is donations, not fees:

```mermaid
flowchart LR
  Buyer[Buyer] -->|sends coins directly —<br/>Monero · Minotari · Zano · Freedom Dollar| Wallet[Seller's wallet]
  Wallet --> Kept[Seller keeps 100%]
  Donors[Voluntary donations] --> Platform[Platform<br/>no custody · no processor<br/>no KYC · 0% fees]
  Platform -.->|never touches the money| Buyer
```

## Stack

Next.js 16 · React 19 · TypeScript · Prisma 6 · PostgreSQL (Neon) ·
NextAuth v4 · next-intl · Leaflet/OpenStreetMap · `simple-peer` (WebRTC) ·
Sharp + Pinata/IPFS · Zod · Jest

```mermaid
flowchart TB
  subgraph Client[Browser · PWA]
    UI[Next.js 16 + React 19<br/>16 locales · offline shell]
  end

  subgraph App[Next.js server]
    Pages[Pages + server actions]
    API[API routes]
    Auth[NextAuth v4]
    Cron[Cron jobs<br/>federation · reminders · backups]
    Fed[ActivityPub<br/>inbox / outbox / nodeinfo]
  end

  subgraph Infra[Backing services]
    DB[(Neon PostgreSQL<br/>Prisma 6)]
    Pinata[Pinata — IPFS pinning<br/>media + durable backups]
    Resend[Resend — transactional email]
    DeepL[DeepL — machine translation]
    Maps[OpenStreetMap tiles]
    WebRTC[simple-peer — P2P rooms]
  end

  UI --> Pages & API
  Pages --> Auth --> DB
  API --> DB
  API --> Pinata & Resend & DeepL
  Cron --> API
  Fed --> API
  UI --> Maps
  UI --> WebRTC
```

### Repository layout

```
src/
├── app/          # Pages, API routes, admin, cron
├── components/   # Shared UI (filters, modals, pickers)
├── hooks/        # useVideoChat (WebRTC + screen share), …
├── lib/          # constants, auth, ipfs, media, i18n routing
├── services/     # backupService (dumps, IPFS, torrents)
├── i18n/         # locale routing + message loading
prisma/           # schema.prisma
public/           # crypto-logos, PWA manifest
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
| `RESEND_API_KEY` | | Transactional email (notifications, verification) | (empty) |
| `EMAIL_FROM` | | Sender address for emails | `noreply@xistrymemz.xyz` |
| `DEEPL_API_KEY` | | Machine translation for missing locales | (empty) |
| `CRON_SECRET` | | Bearer token authorizing `/api/cron/*` routes | (empty) |
| `NEXT_PUBLIC_MAX_VIDEO_DURATION_SEC` | | Cap on uploaded video, in seconds | `900` (15 min) |

### Backups

The admin **Backups** page snapshots the database on a schedule. When Pinata is
configured each dump is delivered three ways — a plain download, an IPFS
gateway link, and a torrent / magnet pair — and falls back to a local-only copy
otherwise:

```mermaid
flowchart TB
  Dump[Database dump — gzip] --> Pinata{Pinata<br/>credentials?}
  Pinata -->|set + upload OK| Pinned[Pinned to IPFS — real CID]
  Pinata -->|missing / failed| Local[local- CID — not durable]

  Pinned --> D1[⬇ Download<br/>authed API route — streams the file,<br/>redirects to the gateway when off-instance]
  Pinned --> D2[🌐 Gateway link<br/>opens IPFS_GATEWAY from anywhere]
  Pinned --> D3[🧲 Torrent path<br/>magnet URI + .torrent metadata file<br/>IPFS webseed + public trackers]

  Local --> L1[⬇ Download only on the instance<br/>that created the backup]
  Local --> L2[⚠️ Local-only badge in the table]
```

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
