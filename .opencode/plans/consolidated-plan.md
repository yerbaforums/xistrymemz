# XistrYmemZ — Consolidated Review & Improvement Plan

> **v1.0** — Merged, deduplicated, code-reconciled plan.
> Consolidates `IMPROVEMENT_PLAN.md` (Phases A–G done; Phases 1–10), `PHASE2_IMPROVEMENTS.md` (Streams A–H),
> and `FEDIVERSE_PLAN.md`. Status is reconciled with the **actual code**.

---

## 1. Site / Feature Review

**XistrYmemZ — "The Cosmic Whitepages Cooperative"** — a local-first marketplace + community/social platform
(Next.js 16 / Prisma+Postgres / 16 locales / Leaflet / Tari + privacy-coin crypto / ActivityPub).

### 10 product pillars
1. **Marketplace** — Shops, Products (rentals/conditions), Services (booking), Directory, Discover (map search), Orders/cart/offers(barter)/checkout/rental.
2. **Requests & Funding** — request lifecycle, funding goals, fulfillments, supports, templates.
3. **Projects (Plans)** — editors/joiners, milestones, phases, contributions/donations, volunteering.
4. **Community & Social** — Wall/posts, Forum, Groups, Connections, Messages, Notifications (SSE), Boards/Pins.
5. **Events** — organizers, ticketing (QR), virtual WebRTC rooms, donations, volunteering.
6. **Schools** — paid/subscription content, courses, enrollments, progress.
7. **Trips** — itinerary/stops/days, shopping lists, linked entities.
8. **Wallet & Crypto** — Tari wallet, deterministic ETH/BTC/privacy-coin wallets, escrow, donations.
9. **Identity** — Earth Passport onboarding, verification levels, reputation, invite codes, roles.
10. **Fediverse + PolySocial** — ActivityPub endpoints done; PolySocial spec-only (IPFS backup partial).

### Actual completion vs. stale docs
| Doc phase | Doc status | Actual code |
|-----------|-----------|-------------|
| IMPROVEMENT Ph1–Ph10 | 🔄 partial | API envelope (`lib/api-helpers.ts`) + 11 service files + federation endpoints **done**; cleanup pending |
| IMPROVEMENT Phase 4 (Federation) | 🔄 | webfinger/nodeinfo/actor/inbox/outbox + delivery cron **done** |
| PHASE2 Streams A–H | ⏳ | **Not started** — no schema changes present |

---

## 2. Consolidated Execution Roadmap (dependency-ordered)

### Track 1 — Trust & Quality (PHASE2 C + D)
Badge/approval foundation; listing UX (Track 1b) consumes it.
- **C Badge & Approval** — Schema: `Product.isApproved/approvedAt/approvedBy`, `User.isShopApproved/shopApprovedAt`;
  `services/qualityService.ts` (profile/listing/shop 0–100); badge APIs (admin CRUD + public); `QualityBadge`/`ApprovalBadge`
  components; profile/shop/product-card integration; admin badge page + nav.
- **D Reviews & Feedback** — Rating unique `[raterId,userId,productId]`, `ratingImages`, `ReviewVote`, `ReviewResponse`;
  Rating component (photos, helpful votes, owner responses); site feedback (form, `/feedback`, admin table); `ReviewPrompt`.

### Track 1b — Local Business Listing Adoption (PHASE2 A)
Directory/shops/products/services: featured row, rating cards, verification badges, quick-list wizard, completeness widget.

### Track 2 — Requests & Projects (PHASE2 E)
Templates, matching API+UI, `assigneeId` + progress bar + deadline countdown, notifications;
project owner dashboard, join `message`, milestone timeline, request↔project linking.

### Track 3 — Recurring Events (PHASE2 F)
Schema (`recurrenceRule`, `parentEventId`, `RecurrenceException`, cancel/reschedule overlays); `lib/recurrence.ts` RRULE
parser/serializer/labeler; form section, instances/exceptions APIs, event-detail enhancements, calendar expansion,
event↔request/product linking.

### Track 4 — Cross-Feature Integration (PHASE2 G)
Discovery→creation CTAs, feed entity embeds, dashboard widgets, shop/group Events tabs.

### Track 5 — Mass-Adoption UX (PHASE2 H + IMPROVEMENT 5/6/10)
PWA/service worker/manifest; `100dvh`; lazy images; bundle analyzer; API caching; username check + `?ref=` invite;
OSS onboarding redirect + autosave; unified `ProductForm` + quick-create parity; search parity; trust signals
(member-since, transaction count, `POST /api/reports`); a11y (focus mgmt, WCAG, skip links); i18n (keys, RTL, locale dates/currency).

### Track 6 — Maintenance Cleanup (IMPROVEMENT 1/5/6/10)
`any`-audit, ConfirmDialog wiring, breadcrumbs, inline-styles→CSS modules, React.memo, federation UI polish.

---

## 3. Batch Prisma Migration (Release A: Tracks 1–3)
All additions in one migration: Product approval, User shop-approval, Rating unique+`ratingImages`, `ReviewVote`,
`ReviewResponse`, Request `assigneeId`, ProjectJoiner `message`, Event recurrence fields, `RecurrenceException`.
**Risk:** Rating unique change — verify existing ratings with `productId = null` before migrating.

---

## 4. Net-New Files (~28) & Modified (~25)
See PHASE2_IMPROVEMENTS.md tables (kept intact per track) plus `lib/recurrence.ts`, `services/qualityService.ts`,
badge/feedback/instance/exceptions/suggest APIs and admin pages. Federation UI polish added to Track 6.

---

## 5. Quick Wins (<1 day each, high signal)
Rating migration safety check · ReviewPrompt after escrow · QuickCreate `published:true`+geo+hashtags ·
username availability + invite pre-fill · post-login onboarding redirect (creds+OAuth) · external-link warning badge ·
`100vh`→`100dvh` · badge row on profile + approval badge on shop/product cards.

---

## 6. Status — v1.1

**Implemented:** Track 1 (C + D), Track 2 (E), Track 3 (F).
- Schema updated in `prisma/schema.prisma`; `prisma generate` done. Project deploys via `db push --accept-data-loss`
  (Vercel build), so the new columns/tables sync on next deploy — no manual migration required against Neon.
- Verified: `npx prisma validate` ✅, `npx prisma generate` ✅.
- Typecheck: **no new errors** from this work (current 83 vs baseline 85 — net −2). All remaining errors are
  pre-existing baseline issues unrelated to these tracks.
- Lint: all newly created files clean; modified files carry only pre-existing lint warnings/errors.

**New files added (Track deliverables):**
`lib/recurrence.ts`, `services/qualityService.ts`, `services/feedbackService.ts`, `components/QualityBadge.tsx`,
`components/ApprovalBadge.tsx`, `components/ProjectDashboard.tsx`, `components/ReviewPrompt.tsx`,
`app/api/events/[id]/instances|exceptions`, `app/api/requests/matches`, `app/api/requests/[id]/assign|in-progress`,
`app/api/ratings/[id]/vote|respond`, `app/api/feedback`, `app/api/admin/badges`, `app/api/admin/products/[id]/approve`,
`app/api/admin/shops/approve`, `app/api/users/[id]/badges`, `app/admin/badges`, `app/admin/feedback`, `app/feedback`.

**Remaining for future releases:** Track 1b (listing adoption UX), Track 4 (cross-feature integration + widgets),
Track 5 (mass-adoption UX / PWA / perf / a11y / i18n), Track 6 (cleanup) — see sections above.
