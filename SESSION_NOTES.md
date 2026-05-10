# Session Notes — 2026-05-09

## Completed Work

### 1. Social Icons Fixed
- **Broken SVGs**: 7 files (`github.svg`, `instagram.svg`, `linkedin.svg`, `youtube.svg`, `tiktok.svg`, `discord.svg`, `telegram.svg`) contained only error text (`Failed to fetch version info for simple-icons@v12.`)
- **Fix**: Replaced all 7 with proper SVG markup from simpleicons.org (linkedin written manually via known path data)
- **Affected pages**: ShareProfileModal, profile/school/shop link cards, profile edit page
- **Footer not affected** — uses inline SVG

### 2. Posting & Interaction Bugs Fixed (6 fixes)

| Bug | Fix |
|---|---|
| Group post like → 404 | Created `src/app/api/groups/[id]/posts/[postId]/like/route.ts` |
| Group post delete → 404 | Created `src/app/api/groups/[id]/posts/[postId]/route.ts` |
| Community page sent `'CONNECTED'` instead of `'ACCEPTED'` | Changed `src/app/community/page.tsx:254` |
| Forum page posted to `/api/posts` (wrong endpoint) | Changed to `/api/forum/posts` at `forum/page.tsx:132` |
| Forum page sent `category` (slug) instead of `categoryId` | Added slug→ID mapping at `forum/page.tsx:117` |
| Connection status PUT accepted any string | Added validation whitelist `['PENDING','ACCEPTED','REJECTED']` at `connections/[id]/route.ts:20-23` |

### 3. Signup Improvements
- **Server-side Zod validation**: `registerSchema` now validates email format, password ≥8 chars, name/username ≥2 chars (if provided), inviteCode optional
- **Password hint**: Client changed from "Minimum 6" → "Minimum 8" to match schema
- **NEXTAUTH_SECRET**: Not changed (was already set in production)

### 4. Fediverse Integration — Server Infrastructure

**Prisma schema additions:**
- User model: `federatedUrl`, `publicKey`, `privateKey`, `followersCount`, `followingCount`, `inboxUrl`, `sharedInboxUrl`, `lastActiveAt`
- New models: `Follow`, `OutboxActivity`, `InboxActivity`

**Routes created:**
| Route | File | Purpose |
|---|---|---|
| `/.well-known/webfinger` | `src/app/.well-known/webfinger/route.ts` | Resolves `acct:user@domain` → ActivityPub actor |
| `/.well-known/nodeinfo` | `src/app/.well-known/nodeinfo/route.ts` | Server discovery |
| `GET /api/fediverse/actor/:username` | `src/app/api/fediverse/actor/[username]/route.ts` | Returns `Person` object with public key |
| `POST /api/fediverse/inbox` | `src/app/api/fediverse/inbox/route.ts` | Receives Follow activities (dedup + store) |
| `GET /api/fediverse/outbox/:userId` | `src/app/api/fediverse/outbox/[userId]/route.ts` | Paginated forum posts as `OrderedCollectionPage` |
| `GET /api/fediverse/nodeinfo/2.1` | `src/app/api/fediverse/nodeinfo/2.1/route.ts` | Server stats |
| `GET /api/cron/deliver-fediverse` | `src/app/api/cron/deliver-fediverse/route.ts` | Delivery queue |

**Other:**
- `src/lib/federation.ts` — `generateActorKeys()`, `deliverToInbox()` (HTTP signatures), `escapeHtml()`
- Registration now generates RSA-2048 keypair and sets `federatedUrl`
- `FEDIVERSE_PLAN.md` — full implementation spec (445 lines)

### 5. IPFS / Storage / Messaging / Persistence — Audit Summary

**Audited but NOT implemented (schema-only or missing):**
- **IPFS**: `File` model exists with CID fields but zero code uses it. Upload route writes to local disk only. No IPFS client libs in package.json.
- **Secure messaging**: Messages stored as plaintext. No encryption. Wallet encryption (AES-256-CBC) exists but not applied to messages.
- **Backups**: `Backup` model exists with IPFS/torrent fields but zero code uses it. No backup scripts, no admin UI.
- **Torrent/P2P**: Backup model has `magnetLink`/`torrentFile` fields but no seeding implementation.

**See `FEDIVERSE_PLAN.md` for full implementation roadmap.**
**See `protocol/polysocial-spec.md` for IPFS/torrent/backup protocol specification.**

---

## Known Issues to Track

1. **Prisma migration not applied** — `prisma migrate dev --name add_fediverse` needs to run against the live DB
2. **Inbox `__remote__` FK bug** — `followerId: '__remote__'` in inbox/route.ts will crash on remote follow due to FK constraint. Fix: make `followerId` nullable in Follow model.
3. **No follow/unfollow UI** — Profile pages lack follow buttons, follower counts, fediverse handle display
4. **No OutboxActivity queue on post creation** — Forum post API doesn't create OutboxActivity records
5. **Inbox only handles Follow** — Accept, Reject, Create, Like, Undo, Announce handlers stubbed
