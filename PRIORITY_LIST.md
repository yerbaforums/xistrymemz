# Development Priority List

> **v2.2 — Updated from Session 2 (Translations + Community Layout).** Reflects completion of i18n, new languages, language request feature, dashboard breadcrumb cleanup, sidebar sticky fix, project creation error handling, community sidebar unification, and breadcrumb label gaps.
> **Execution strategy**: All passes follow the 7-step cycle in `.opencode/plans/pass-playbook.md`.

---

## ✅ Completed Items

### From Session Plans (`.opencode/plans/`)
| Item | Status |
|------|--------|
| Footer UI restructured (`.bottomBuiltWith`, version badge) | ✅ |
| CRYPTO_LOGOS → `src/lib/constants.ts` (used in 12 files) | ✅ |
| Shops layout auth gate removed (public layout w/ breadcrumbs) | ✅ |
| Schools layout auth gate removed (public layout w/ breadcrumbs) | ✅ |
| Products API: `{ products: [...] }` envelope + `pinned` filter + `shopSlug` include | ✅ |
| Products page: handles `data.products` envelope gracefully | ✅ |
| Home page modular refresh (PulseSection, animated stats, requests, plans, events, boards, trending hashtags) | ✅ |
| Donation DnD reorder (`handleReorderDonations`, drag handles, index params) | ✅ |
| FIRO logo PNG at `public/crypto-logos/firo.png` | ✅ |

### From Priority Plan — Phase 1 (Fix Breaks)
| Item | Status |
|------|--------|
| ESLint flat config: `eslint-config-next`, `@typescript-eslint`, proper `ignores`, strict rules | ✅ |
| Auth bcrypt guard: `if (!user.password) return null` at line 59 | ✅ |
| MobileNav `session` typed as `Session \| null` | ✅ |
| Header `CustomEvent<{ traveling: boolean }>` generic param | ✅ |

### From Priority Plan — Phase 2 (Foundation)
| Item | Status |
|------|--------|
| `<ErrorBoundary>` component (class-based, with fallback + onError props) | ✅ |
| Centralized types: `src/types/` with 11 files (Api, Plan, Product, Event, Request, User, Group, Hashtag, Notification, Service, next-auth) | ✅ |
| Service layer: `src/services/` with 5 services (plan, message, backlink, hashtag, backup) | ✅ |

### From Priority Plan — Phase 3 (Universal Hashtags)
| Item | Status |
|------|--------|
| 4 Prisma junction models: `SchoolContentHashtag`, `PlanHashtag`, `RequestHashtag`, `GroupHashtag` | ✅ |
| `HashtagInput` component + `.module.css` (autocomplete, trending suggestions, removable pills) | ✅ |
| `hashtagService.ts` with centralized extraction/linking methods | ✅ |

### From Priority Plan — Phase 4 (Backlinking)
| Item | Status |
|------|--------|
| Backlink Prisma model (with indexes + unique constraint) | ✅ |
| `backlinkService.ts` | ✅ |

### From Priority Plan — Phase 5 (Federation)
| Item | Status |
|------|--------|
| Fediverse API endpoints: `actor/[username]`, `inbox`, `outbox/[userId]`, `nodeinfo/2.1` | ✅ |

### From Priority Plan — Phase 7 (UI/UX) — Core Components
| Item | Status |
|------|--------|
| `<Skeleton>` component + `SkeletonCard` export | ✅ |
| `<EmptyState>` component (icon, title, description, action) | ✅ |
| `<ConfirmDialog>` component (danger/warning/default variants, keyboard support) | ✅ |
| `ToastContext` (success/error/warning/info, auto-dismiss, stacking) | ✅ |

### From Priority Plan — Phase 10 (Onboarding)
| Item | Status |
|------|--------|
| 6-step onboarding flow: Welcome → Profile → Class Setup → Tour → Community → Complete | ✅ |

### From Priority Plan — Phase 11 (Polish)
| Item | Status |
|------|--------|
| `design-system.css` (160+ lines, comprehensive tokens) | ✅ |
| `useMemo` used 43 times across 17+ files (PublicPlansClient, EventsPage, ProductsClient, DirectoryPage, etc.) | ✅ |

### Pass 4 — Site Structure + UX/UI Polish
| Item | Status |
|------|--------|
| **Dragon Loading Animation**: `Loading.tsx` + CSS module with float/glow/fade keyframes | ✅ |
| **Empty State Unification**: ~30 replacements across Header, InboxView, LinkItemModal, EntityActions, DashboardTodo, BookAppointmentModal, admin/orders/users/subscribers, discover, profile (7 tabs), groups (6 tabs), shop/rentals, PlanDetailClient (calendar+history), RequestDetailClient (supporters/offers/history) | ✅ |
| **Inline Style Migration (Batch 1)**: TipModal (21 → 0), ReplySection (16 → 0), ServiceCard (15 → 0) | ✅ |
| **Micro-interactions**: `page-enter`, `card-hover`, `grid-card`, `btn-press`, `stagger-enter` in globals.css; applied to 7 pages + Button | ✅ |
| **Hashtag Pills**: Plans, Requests, Groups detail pages + 4 type interfaces extended | ✅ |
| **Type Cleanup**: 9 TS errors fixed across 3 detail pages + GroupSummary | ✅ |

### From Session 2 (Translations + Community Layout)
| Item | Status |
|------|--------|
| **i18n Audit**: `pt.json` missing key fixed; `de`, `it`, `ru`, `ar`, `hi`, `ja`, `zh` fully translated from English copies | ✅ |
| **5 New Languages**: `ko`, `nl`, `pl`, `sv`, `tr` — registered in routing, middleware, LocaleProvider, Header, MobileNav, layout OG_LOCALE_MAP | ✅ |
| **Language Request Feature**: `/api/language-request` route + `LanguageRequestModal` component + "Request Language" links in header locale dropdowns and mobile nav | ✅ |
| **Dashboard Sidebar Sticky Fix**: `.layout` `overflow-x: hidden` → `overflow-x: clip` to allow `position: sticky` on sidebar | ✅ |
| **Dashboard Breadcrumb Cleanup**: Removed duplicate `<Breadcrumbs>` from 15 dashboard page files; feed page title `t('title')` → `t('feed')` | ✅ |
| **Plan Creation Error Handling**: Added try/catch to `/api/plans` POST handler + added `status`/`published` to `planSchema` | ✅ |
| **Unified Community Sidebar**: Sticky sidebar w/ profile strip, 5 nav items (Members, Forum, Groups, Connections, Boards), matching dashboard UX | ✅ |
| **BREADCRUMB_LABELS Gaps Filled**: Added `messages`, `community`, `video`, `appointments` entries | ✅ |

---

## ⏳ Remaining Work

---

## Phase 1: Fix Remaining Breaks (~3 hrs)

### 1.1 Middleware Deprecation
- **Status**: ❌ Cancelled — not needed in Next.js 16 (build confirms `ƒ Proxy (Middleware)` works correctly)

### 1.2 Fix Test Environment
- **Location**: `jest.config.js`, `__tests__/setup.ts`
- **Issue**: `testEnvironment: 'jsdom'` — API tests need node environment; missing `fetch`/`Request`/`setImmediate` polyfills
- **Fix**: Switch to `jest-environment-node`, add `node-fetch`/`undici`, add `setImmediate` polyfill for Prisma, create test DB setup

### 1.3 Fix Fire-and-Forget Prisma Writes
- **Status**: ✅ Done

### 1.4 Deduplicate Notification Button
- **Status**: ✅ Done

### 1.8 Fix Plan Creation Error Handling
- **Status**: ✅ Done — added try/catch to `/api/plans` POST handler + `status`/`published` fields to `planSchema`
- **Note**: Other API routes (products, events, requests, etc.) still lack try/catch — apply same pattern

### 1.5 Audit `any` Types (Ongoing)
- **Location**: `src/app/api/` (7 files flagged)
- **Issue**: Typed `where` clauses still use `Record<string, unknown>`
- **Fix**: Add proper typed interfaces per route

### 1.6 React.memo() — Card Components
- **Status**: ✅ Done (ProductCard, SharedItemCard, ServiceCard, BoardPinCard)

### 1.7 Loading... → Skeleton (Full Pass)
- **Status**: ✅ Done (32 of ~38 instances; 6 low-impact Suspense fallbacks remain)

---

## Phase 2: Complete Foundation & Infrastructure (2-3 days)

### 2.1 Unified API Response Envelope
- **New file**: `src/lib/api-helpers.ts`
- **Helpers**: `apiResponse<T>()`, `apiError()`, `withAuth()`, `requireAdmin()`, `withValidation()`
- **Frontend**: `apiGet<T>()`, `apiPost<T>()`, `apiPut<T>()`, `apiDelete<T>()` — parse `{success, data, error}` and throw on failure
- **Scale**: Refactor ~60 API routes to use standard envelope

### 2.2 Missing Services (6 files)
- **Create**: `productService.ts`, `requestService.ts`, `eventService.ts`, `userService.ts`, `notificationService.ts`, `walletService.ts`
- **Goal**: Extract business logic from API routes; routes become thin HTTP handlers

### 2.3 Database Transactions
- **Affected**: Order creation, wallet transfers, event join/leave, escrow release
- **Fix**: Wrap multi-step ops in `prisma.$transaction()` with rollback

---

## Phase 3: Universal Hashtags — ✅ Complete

---

## Phase 4: Complete Backlinking + Social Sharing (1.5-2 days)

### 4.1 Universal ShareBar Component
- **New file**: `src/components/ShareBar.tsx`
- **Replace**: 4 separate share modals
- **Features**: Copy Link, Share to Feed, QR Code, social share (X, Facebook, LinkedIn, Telegram, WhatsApp, Email, Fediverse)
- **Embed**: All entity detail pages

### 4.2 Auto-Generated Related Items
- Backend: Query backlinks for entity → frontend section on every detail page

### 4.3 Manual Linking UI
- "Link to..." button in content editors with entity search + keyboard nav

### 4.4 Cross-Posting Engine
- Create post → offer cross-post to Wall + Shop + School + Group + Forum

---

## Phase 5: Complete Federation / ActivityPub (2-3 days)

### 5.1-5.6
- Key gen on registration, Follow model, wire inbox/outbox, outbound cron, federation UI, security

---

## Phase 6: Navigation & Layout Overhaul (2 days)

### 6.1 Global Command Palette
- `Cmd+K` modal, unified search, keyboard nav, context actions

### 6.2 ERP-Style Sidebar
- Collapsible icon-only, role-gated sections

### 6.3 Mobile Bottom Navigation
- Home, Feed, Create, Messages, Profile

### ⏳ 6.4 Unified Breadcrumbs — Remaining Work
Add `<Breadcrumbs>` to these missing directories:
| Directory | Pages |
|-----------|-------|
| Dashboard | overview, messages, community, studio, planning, requests, projects, marketplace, teaching, shop, video, events, feed, appointments (14 pages) |
| Admin (partial) | messages, backups, analytics, users, invite-codes, subscribers, orders, settings (8 pages) |
| Auth | login, register, forgot-password, reset-password, verify-email (5 pages) |
| Other | connections, offers/[id], posts/[id], projects, rentals/browse, rentals/page, settings/account, settings/privacy, settings/notifications, shops, trips/[id] (11 pages) |

### 6.5 Navigation Cleanup
- Remove duplicate entry points, hide admin from non-admin, progressive loading

### ✅ 6.6 Unified Community Sidebar
- **Status**: ✅ Done — sticky sidebar w/ profile strip, 5 nav items (Members, Forum, Groups, Connections, Boards), matching dashboard UX pattern
- **Note**: Community sidebar now has same sticky behavior, profile dropdown, and responsive mobile layout as dashboard sidebar

### ✅ 6.7 BREADCRUMB_LABELS Gaps
- **Status**: ✅ Done — added `messages`, `community`, `video`, `appointments` entries for consistent breadcrumb rendering

---

## Phase 7: UI/UX Consistency (2 days — 5-8h remaining)

### 7.1 Component Library Standardization
- Use `ui/Button`, `ui/Card`, `ui/Modal`, `ui/Badge`, `ui/Avatar` everywhere
- **⏳ Inline style → CSS module migration**: 3/20 files done. Remaining top 8:

| File | Inline Styles | Module Status |
|------|:------------:|:-------------:|
| `plans/[id]/PlanDetailClient.tsx` | 37 | ❌ Needs new CSS module |
| `admin/settings/page.tsx` | 35 | Has `page.module.css` — migrate inline styles into it |
| `connections/page.tsx` | 31 | ❌ Needs new module |
| `dashboard/appointments/page.tsx` | 29 | ❌ Needs new module |
| `plans/[id]/PlanUpdates.tsx` | 26 | ❌ Needs new module |
| `posts/[id]/page.tsx` | 23 | ❌ Needs new module |
| `trips/[id]/TripView.tsx` | 23 | ❌ Needs new module |
| `dashboard/overview/page.tsx` | 20 | Has `OverviewCards.module.css` — migrate |

### 7.2 Loading States
- **Status**: ✅ 32 of ~38 instances done (6 low-impact remain)

### 7.3 Empty States
- **Status**: ✅ Pass 4 replaced ~30 instances. Custom-styled states (dashboard/studio, dashboard/saved, dashboard/appointments, ProjectsClient, hashtag pages) intentionally kept as-is.

### ⏳ 7.4 Toast Coverage
- **Status**: 🟡 Toasts used in ~48 files (~350+ calls). Check for gaps in:
  - Dashboard settings/profile edit (update toasts)
  - Admin analytics/backups (missing CRUD feedback)
  - Offers, Trips, Rentals pages
  - Connection management (add/remove feedback)

### ⏳ 7.5 ConfirmDialog for Destructive Actions
- **Status**: 🟡 Only 5/35 pages with DELETE operations currently use ConfirmDialog
- **Priority pages to wire**: groups/[id] (6 ops), dashboard/ pages (~20 ops), community/forum/[postId] (2 ops), connections (1 op), Plans (2 ops)
- **Files added so far**: profile/[username], products/[id], events/[id], profile/edit, school/[slug]

### ✅ 7.6 Micro-interactions
- **Status**: ✅ Done — keyframes + classes in globals.css, applied to 7 pages + Button

---

## Phase 8: School Content Customization (2-3 days)

### 8.1-8.3
- Curriculum builder, progress tracking, student management

---

## Phase 9: Dashboard as ERP Hub (2 days)

### 9.1-9.5
- Unified inbox, quick actions, widgets, directory expansion, smart cross-linking

---

## Phase 10: Onboarding & Help (1-1.5 days)

### 10.1-10.2
- Contextual help, guided tours, first-use triggers

---

## Phase 11: Polish & Performance (2 days)

### 11.1-11.5
- CSS audit, performance (memo/virtualization/dynamic imports), a11y, security, testing

---

## Effort Summary

| Phase | Effort | Dependencies | Status |
|-------|--------|-------------|--------|
| **P1: Fix Breaks** | 3 hrs | None | 🔄 1 item pending (any types) |
| **P2: Foundation** | 2-3 days | P1 | 🔄 Partial (5 of 11 services) |
| **P3: Hashtags** | — | Once | ✅ Done |
| **P4: Sharing** | 1.5-2 days | P2 | ⏳ |
| **P5: Federation** | 2-3 days | P2 | 🔄 Routes done |
| **P6: Navigation** | 2 days | None | ⏳ Breadcrumbs 35pp pending |
| **P7: UI/UX** | 2 days | P6 | 🔄 Inline styles ~17 files pending; ConfirmDialog ~30 pp pending |
| **P8: School** | 2-3 days | P2 | ⏳ |
| **P9: Dashboard** | 2 days | P2, P7 | ⏳ |
| **P10: Onboarding** | 1-1.5 days | None | 🔄 Flow done, help pending |
| **P11: Polish** | 2 days | P7 | 🔄 Partial |

**Total remaining: ~15-20 days**

---

## Quick Wins (Parallelizable, < 1 day each)

1. ✅ ESLint config fixed
2. ✅ Auth bcrypt guard added
3. ✅ MobileNav session typed
4. ✅ Header CustomEvent typed
5. ❌ Middleware rename cancelled
6. ✅ Fire-and-forget fixed
7. ✅ Notification button deduplicated
8. 🟡 React.memo on 4/6 cards
9. ✅ Skeleton sweep (32/38)
10. ✅ Empty state unification (30+ replacements)
11. ✅ Micro-interactions (globals.css + 7 pages + Button)
12. ✅ Inline styles: TipModal, ReplySection, ServiceCard
13. ✅ Hashtag pills on Plans, Requests, Groups
14. 🟡 Breadcrumbs: dashboard 14pp ✅ (removed redundant), 35pp total pending
15. ⏳ ConfirmDialog: wire to 35 DELETE operations
16. ✅ Language pack: 11 full locales + 5 new languages + language request
17. ✅ Community sidebar: sticky + unified nav + profile strip
18. ✅ Plan creation error handling + schema fix
