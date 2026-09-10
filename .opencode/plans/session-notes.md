# XistrYmemZ — Session Notes (Roadmap Implementation: Tracks 1–3)

> Saved for the next session. All changes are **uncommitted** in the working tree on `main`.

## What was implemented

Four roadmap streams (from `.opencode/plans/consolidated-plan.md`): **C + D (Trust & Quality), E (Requests & Projects), F (Recurring Events)**.

### Schema — `prisma/schema.prisma` (validated, client regenerated)
- `Product.isApproved/approvedAt/approvedBy`
- `User.isShopApproved/shopApprovedAt`, `User.assignedRequests`
- `Rating.ratingImages` + **new** `@@unique([raterId, userId, productId])`
- New models: `ReviewVote`, `ReviewResponse`, `RecurrenceException`
- `Request.assigneeId`/`assignee`, `ProjectJoiner.message`
- `Event` recurrence fields (`recurrenceRule`, `recurrenceEnd`, `parentEventId`, `childEvents`, `recurrenceMeta`, `isCancelled`, `cancelReason`, `isRescheduled`, `rescheduledTo`, `overrideTitle`, `overrideDescription`) + `recurrenceExceptions`

### New files
- `lib/recurrence.ts` — RRULE parse/serialize/label (pure JS)
- `services/qualityService.ts` — profile/listing/shop quality scores (0–100)
- `services/feedbackService.ts` — JSON-file feedback store at `data/feedback.json`
- `components/QualityBadge.tsx`, `ApprovalBadge.tsx`, `ProjectDashboard.tsx`, `ReviewPrompt.tsx`
- APIs: `api/admin/badges` (+`[id]`), `api/admin/products/[id]/approve`, `api/admin/shops/approve`, `api/users/[id]/badges`, `api/ratings/[id]/vote|respond`, `api/feedback`, `api/requests/matches`, `api/requests/[id]/assign|in-progress`, `api/events/[id]/instances|exceptions`
- Pages: `admin/badges`, `admin/feedback`, `feedback`

### Modified (30+ files)
Event form/detail + persistence, Rating component (+photos/votes/responses), RequestForm templates, RequestDetailClient (matching/progress/deadline/link-to-project), ProjectDetailClient/Milestones/Support/page, ProductCard, ShopDetailClient, ProfileDetailClient, schema/type files, `lib/navigation.ts`, `lib/schemas.ts`, `lib/project-utils.ts`, etc.

## Verification already done
- `npx prisma validate` ✅ · `npx prisma generate` ✅
- Typecheck: **83 errors now vs 85 baseline — zero new errors** from this work; all remaining are pre-existing baseline issues.
- Lint: all **new** files clean; modified files carry only pre-existing issues (a `fetchRatings` ordering error in `Rating.tsx` was fixed).
- Jest: component suites **pass (17)**; API suites (16) **fail purely because Neon schema isn't migrated** (`isShopApproved does not exist`) + pre-existing harness gaps (`Request`/`setImmediate` undefined, `TEST_BASE_URL` needs a running dev server). None caused by this work.

## Remaining / decisions for next session
1. **Run `npm run build`** — NOT yet executed. Expect failure on the **pre-existing ~85 type errors** (baseline isn't build-clean even without these changes). If a green build is required, those must be fixed first (out of scope of this feature work).
2. **Push schema to DB** — production Neon uses `prisma db push --accept-data-loss` on Vercel deploy. NOT pushed manually (avoids risking production). Options:
   - (Recommended) let schema sync on next Vercel deploy, OR
   - run `npx prisma db push` explicitly against Neon.
   The new columns/tables will not exist on the DB until this happens — API integration tests in `__tests__/api/*` will keep failing until then.
3. **API test green-up** — deferred: user did not select the migrate-DB + harness-fix option. Would require fixing `setImmediate`/`Request` polyfills + `TEST_BASE_URL` harness + migrated schema.
4. **Commit** — nothing is committed. ~53 source files changed/added. `.opencode/plans/consolidated-plan.md` and `PHASE2_IMPROVEMENTS.md` are untracked (new).

## Plan docs
- `.opencode/plans/consolidated-plan.md` — merged roadmap; **section 6 (v1.1) reflects Tracks 1–3 as implemented**.
- Legacy `IMPROVEMENT_PLAN.md` / `PHASE2_IMPROVEMENTS.md` are now superseded/out-of-date relative to code.

---

# Session 2 — Escrow/Wallet Gut → Direct Orders, Deposit Removal, Crypto Slim-Down (FUSD)

> Supersedes `.opencode/plans/dero-removal-ux-polish.md` (DERO section also handled here). All changes **uncommitted**.

## What was implemented

### Direct-sales Order system (replaces escrow + wallet/deposits/payments)
- **Prisma**: removed `Wallet` (+`WalletTransaction`), `EscrowTransaction`, `Payment`, `Deposit` models. Added `Order` with `PENDING→PAID→SHIPPED→DELIVERED` (cancel from PENDING/PAID), denormalized `sellerPayoutAddress/sellerPayoutCurrency`, optional courier (`courierServiceId/courierId/courierStatus REQUESTED→BOOKED→IN_TRANSIT→DELIVERED`, `courierFee`, `deliveryAddress`, `trackingNumber`), `notes`, `completedAt`. `db push` (migrate dev broken on P3006 — do not create migrations).
- **APIs**: `api/orders` GET (filters all/buyer/seller/courier + `admin=true` bypass) + POST (one order per seller, validates seller, locks courier fee). `api/orders/[id]` GET/PUT with participant actions (`mark_paid/ship/deliver/cancel`, `courier_accept/courier_pickup/courier_delivered`, `update_tracking/update_notes`) and admin overrides (`admin_set_status`, `admin_set_courier`).
- **Pages**: `orders` + `orders/[id]` (per-role status buttons, payout display, notes editor, timeline, courier section); `admin/orders` (stats + radio overrides); `checkout` fully rewritten (groups cart by seller → order per seller, optional courier + delivery address, success screen shows per-seller payout addresses); `ProductDetailClient` Buy Now → direct order modal + ungated payout editor; `products/new` + marketplace + rentals + shop/setup always `paymentType: 'DIRECT'` (payment-type selectors removed); `dashboard/overview` now Orders-backed (donation-only wallet card removed).

### Deletions
- Routes: `api/deposits`, `api/wallet`, `api/escrow(+/[id])`, `api/payments`, `api/admin/wallets`, `api/admin/crypto`, `api/crypto/sync`, `admin/wallets` page, `TariWalletContext.tsx`, `lib/wallet.ts`, `lib/payments.ts`, `lib/tari-wallet.ts`, `services/walletService.ts` (dead, referenced removed `prisma.wallet`). Profile edit/settings: wallet UI removed. Profile schema (`lib/schemas.ts`) no longer accepts wallet/payment/refund addresses or crypto currency.

### Crypto slim-down → XMR / XTM / ZANO / FUSD
- **Freedom Dollar (FUSD)**: Zano-based stablecoin; official CoinGecko logo downloaded to `public/crypto-logos/freedom-dollar.png`; live price via `lib/prices.ts` (`freedom-dollar` id, fallback $1).
- Trimmed BTC/ETH/USDT/USDC/ARRR/DERO/FIRO from `lib/constants.ts`, `lib/crypto-icons.ts`, `lib/prices.ts`, donation-address picker, onboarding, project support, event currency select, `EntityActions` tips, tip-options + tip-rate routes (defaults now XMR). NLP: all `'ETH'` fallback defaults → `'XMR'` across products/projects/events/profile/dashboard APIs and pages; `Footer` `$` display includes FUSD.

## Verification done
- `npx tsc --noEmit`: **65 errors, all pre-existing baseline** (events `isVirtual/meetingLink`, dashboard/events `locationMode`, EventDetailClient `locationMode`, products `[...id]/page` params, products/page price array nullability, admin/users plans-vs-projects, community/fediverse/forum/schools clusters). Zero new errors from this work; removing `walletService.ts` dropped 7.
- Jest: ProductCard suite passes (13/13). API suites still blocked by non-migrated Neon schema + harness gaps (pre-existing).
- ESLint on all touched files: no new errors beyond repo-wide pre-existing rules (react-hooks/set-state-in-effect, before-declared, no-unused-vars).

## Remaining / decisions for next session
1. **`npm run build` never run** — expect failure on the ~65 pre-existing type errors (`ignoreBuildErrors` may mask). Route-import integrity is verified via tsc + grep (no references to deleted routes/modules remain in `src`, excluding `.next`).
2. **Push schema to DB** — Order table/couloumns (and Session-2 drops) only land via `prisma db push --accept-data-loss` on next Vercel deploy (or manual run against Neon).
3. **Cosmetic leftovers (intentional)**: CSS class names/var names containing `escrow` (`escrowBtn`, `escrowLoading`, `escrowSummary`) are inert naming only; historical forum changelog text mentions escrow fees (old content); old logo PNGs (bitcoin/ethereum/tether/usd-coin/pirate-chain/dero/firo) remain in `public/crypto-logos/` but are unreferenced.
4. **Commit** — ~170 files changed/deleted + untracked additions (`.opencode/`, `PHASE2_IMPROVEMENTS.md`, `freedom-dollar.png`, new components/APIs from Session 1).
