# Session Working Notes

> **Last audit: June 2026** — Comprehensive review of all plan files vs actual codebase.
> **Methodology**: All passes follow the 7-step cycle defined in `.opencode/plans/pass-playbook.md`.
> **Pass 2 (Fresh Pass)**: Batch 1 — Loading→Skeleton full sweep, React.memo additions, EmptyState adoption start.
> **Pass 3 (Boards + Passport)**: Boards listing page centered on user's passport location; custom passport marker; quick location update UI (set on map, auto-detect, fly home).

---

## ✅ Complete — All Session Plan Items

| Session Plan | Items | Status |
|-------------|-------|--------|
| Footer UI/UX improvements | `.bottomBuiltWith`, version badge, CRYPTO_LOGOS extraction | ✅ Done |
| Donation DnD reorder | `handleReorderDonations`, drag handles, `index` param | ✅ Done |
| Products/shops/schools/home enhancements | API envelope, auth gates, shops search/filter, schools CSS, home refresh | ✅ All Done |
| Product & Shop UI improvements | QR button, FIRO logo, product form hashtags, payment hiding | ✅ All Done |

## ✅ Complete — From Priority Plan (after audit)

| Phase | Key Items | Status |
|-------|-----------|--------|
| P1: Fix Breaks | ESLint, bcrypt, MobileNav, Header types + auth.ts catch + Header dedup | ✅ 6 of 7 items (1 cancelled) |
| P2: Foundation | ErrorBoundary, centralized types (11 files), service layer (5 services) | ✅ Partial |
| P3: Universal Hashtags | 4 junction models, HashtagInput, hashtagService | ✅ Complete |
| P4: Backlinking | Backlink model, backlinkService | ✅ Partial |
| P5: Federation | actor, inbox, outbox, nodeinfo endpoints | ✅ Partial (routes exist) |
| P7: UI/UX | Skeleton, EmptyState, ConfirmDialog, ToastContext + Loading→Skeleton sweep | ✅ Components exist, adoption ~85% |
| P10: Onboarding | 6-step flow (Welcome → Profile → Class Setup → Tour → Community → Complete) | ✅ Complete |
| P11: Polish | design-system.css, 43 useMemo usages, React.memo on 4 cards | ✅ Partial |

---

## ✅ Completed in Pass 2 (Fresh Pass)

| Item | Files | Status |
|------|-------|--------|
| Loading... → Skeleton: dashboard (8 pages) | marketplace, passport, rentals, services, teaching, video, shop, saved | ✅ Done |
| Loading... → Skeleton: admin (5 pages) | orders, wallets, subscribers, invite-codes, messages | ✅ Done |
| Loading... → Skeleton: user-facing (14+ pages) | school setup, wallet, schools list, onboarding, forum post, community layout, courier setup, shop setup, AvailabilityEditor, services page | ✅ Done |
| React.memo() | BoardPinCard | ✅ Done |
| EmptyState adoption | shop detail (3 sections), services list page | ✅ Done |
| **Total Loading... replaced** | ~32 of ~38 instances (6 low-impact remain) | ✅ 84% |
| **Boards + Passport integration** | Map centered on passport location, passport marker, quick location update UI (set on map, auto-detect, fly home) | ✅ Done |

## ⏳ Remaining Work (Prioritized)

### Phase 1: Boards Feature (next steps)
1. **Board CRUD** — edit board modal, delete board, board settings
2. **PinToBoardButton** on remaining 4 entity types (services, shops, school, requests)
3. **Unified MapView** component (shared across app)
4. **ViewCount on boards + pins**
5. **Boards on profile + dashboard widget**
6. **Hashtags on boards/pins**
7. **Boards in search**

### Phase 2: Fix Breaks
1. **Fix test env** — switch jest from jsdom to jest-environment-node, add polyfills
2. **`any` type audit** — 7 API route files with `Record<string, unknown>`
3. **6 Suspense fallbacks** — auth/verify-email, auth/reset-password, events/new, groups/new (auth guard), profile load-more button, Loading component default — low impact

### Phase 2: Foundation (2-3 days)
4. **Unified API envelope** — `src/lib/api-helpers.ts` with `withAuth()`, `requireAdmin()`, `withValidation()`
5. **6 missing services** — productService, requestService, eventService, userService, notificationService, walletService
6. **Database transactions** — wrap multi-step ops in `$transaction()`

### Phase 3: Social Sharing (1.5-2 days)
7. **ShareBar** — universal component replacing 4 separate share modals
8. **Related Items** — auto-generated from backlinks on every entity detail page

### Phase 4: Federation (2-3 days)
9. **Key gen on registration**, **Follow model**, **wire inbox/outbox**, **federation UI**

### Phase 5: Navigation (2 days)
10. **Command palette**, **ERP sidebar**, **mobile bottom nav**, **breadcrumbs**

### Phase 6: UI/UX (1.5 days remaining)
11. **Component standardization** — use ui/Button, ui/Card everywhere, remove inline styles
12. **Empty state adoption** — ~25 bare instances remain (admin/dashboard)
13. **Toast coverage** — consistent toasts for ALL CRUD operations
14. **ConfirmDialog** — for all destructive actions
15. **Micro-interactions** — card hover, button active, page transitions

### Phase 7-10: School, Dashboard, Help, Polish (7-9 days)
16. Curriculum builder, student management, unified inbox, dashboard widgets, accessibility, performance, security, tests

---

## Implementation Notes

### Key Files Referenced
- `PRIORITY_LIST.md` — full phased execution plan with completion checkboxes
- `IMPROVEMENT_PLAN.md` — architecture-focused plan with current state assessment
- `MANUAL_CHECKLIST.md` — 411-item QA verification checklist

### Architecture Patterns
- **CSS**: CSS Modules for components, `design-system.css` for tokens, `globals.css` for reset
- **API**: Moving toward `{success, data, error}` envelope with service layer
- **Auth**: NextAuth.js with credentials + OAuth providers
- **DB**: Prisma ORM (PostgreSQL on Neon production, SQLite dev)
- **i18n**: next-intl with 4 locales (en, es, fr, pt)

### Git Log (Latest)
```
2314ccf Unify event forms into reusable EventFormFields + AssetPicker components
ea876a6 fix: boards map markers, internal links new-window, travel mode persistence
b191015 fix: use MapController component to properly capture Leaflet map instance
cdbe280 feat: board UX enhancements — map auto-fit, flyTo, custom markers, always-show map, 90-day prefill, image upload, city name
5851800 fix: replace MapContainer onClick with useMapEvents handler component
e81eef7 feat: home page features integration + map-based board creation
a6583cb feat: all user content types available as assets for pinning
06da8b0 feat: auto-create boards from passport locations, live asset picker in CreatePinModal
```
